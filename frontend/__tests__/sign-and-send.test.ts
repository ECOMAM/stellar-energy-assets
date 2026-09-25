// @vitest-environment node
// (the transaction is serialized to XDR; see __tests__/setup.ts)
import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// signAndSend (WalletContext) = sendContractCall (lib/transactions.ts)
// with a mocked Soroban RPC server and a mocked Freighter.
// ═══════════════════════════════════════════════════════════

const rpc = vi.hoisted(() => ({
  getAccount: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
}));

const freighter = vi.hoisted(() => ({
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  class FakeServer {
    getAccount = rpc.getAccount;
    prepareTransaction = rpc.prepareTransaction;
    sendTransaction = rpc.sendTransaction;
    getTransaction = rpc.getTransaction;
  }
  return { ...actual, rpc: { ...actual.rpc, Server: FakeServer } };
});

vi.mock("@stellar/freighter-api", () => freighter);

import * as sdk from "@stellar/stellar-sdk";
import { CONTRACT_ID, TX_EXPLORER } from "@/lib/contract";
import {
  TxError,
  XLM_BALANCE_TOO_LOW_MESSAGE,
  describeTxError,
  errorText,
  parseContractErrorCode,
  txHashOf,
} from "@/lib/contractErrors";
import { cachedRead } from "@/lib/readCache";
import { describeTxFailure, scErrorText, sendContractCall, type ContractCallInput } from "@/lib/transactions";

const SOURCE = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";
const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const HASH = "3f2a9c1be0d4a5f6c7b8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e";
/** The branch of app/project/[id]/client.tsx that shows "Firma Rechazada". */
const REJECTED_BRANCH = /reject|cancel|declin|denied|Request closed/i;

const call = (over: Partial<ContractCallInput> = {}) =>
  sendContractCall({
    source: SOURCE,
    contractId: CONTRACT_ID,
    method: "claim_revenue",
    args: [SOURCE, 1],
    poll: { attempts: 3, intervalMs: 0 },
    ...over,
  });

const failure = (p: Promise<unknown>) => p.then(() => expect.fail("should have thrown"), (e: unknown) => e as TxError);

const sent = (status: string, extra: object = {}) => ({ status, hash: HASH, latestLedger: 1, latestLedgerCloseTime: 1, ...extra });

/** Diagnostic event "topics:[error, Error(Contract, #code)]" emitted by `contractId`. */
function contractErrorEvent(contractId: string, code: number) {
  return new sdk.xdr.DiagnosticEvent({
    inSuccessfulContractCall: false,
    event: new sdk.xdr.ContractEvent({
      ext: sdk.xdr.ExtensionPoint.v0(),
      contractId: new sdk.xdr.ContractId(sdk.StrKey.decodeContract(contractId)),
      type: sdk.xdr.ContractEventType.diagnostic,
      body: sdk.xdr.ContractEventBody.v0(
        new sdk.xdr.ContractEventV0({
          topics: [sdk.nativeToScVal("error", { type: "symbol" }), sdk.xdr.ScVal.scvError(sdk.xdr.ScError.sceContract(code))],
          data: sdk.nativeToScVal("failing with contract error"),
        })
      ),
    }),
  });
}

function txResult(result: sdk.xdr.TransactionResultResult) {
  return new sdk.xdr.TransactionResult({ feeCharged: BigInt(100), result, ext: sdk.xdr.TransactionResultExt.v0() });
}

const trapped = () =>
  txResult(
    sdk.xdr.TransactionResultResult.txFailed([
      sdk.xdr.OperationResult.opInner(
        sdk.xdr.OperationResultTr.invokeHostFunction(sdk.xdr.InvokeHostFunctionResult.invokeHostFunctionTrapped())
      ),
    ])
  );

beforeEach(() => {
  vi.resetAllMocks();
  rpc.getAccount.mockImplementation(async (id: string) => new sdk.Account(id, "1"));
  rpc.prepareTransaction.mockImplementation(async (tx: unknown) => tx);
  freighter.getNetworkDetails.mockResolvedValue({
    network: "TESTNET",
    networkUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: sdk.Networks.TESTNET,
  });
  freighter.signTransaction.mockImplementation(async (xdr: string) => ({ signedTxXdr: xdr, signerAddress: SOURCE }));
});

describe("signAndSend: sendTransaction status", () => {
  it("PENDING -> NOT_FOUND -> SUCCESS resolves with the hash and the return value", async () => {
    rpc.sendTransaction.mockResolvedValue(sent("PENDING"));
    rpc.getTransaction
      .mockResolvedValueOnce({ status: "NOT_FOUND", txHash: HASH })
      .mockResolvedValueOnce({ status: "SUCCESS", txHash: HASH, returnValue: sdk.nativeToScVal(250000000n, { type: "u128" }) });
    const onSigned = vi.fn();

    const res = await call({ onSigned });

    expect(res.txHash).toBe(HASH);
    expect(sdk.scValToNative(res.returnValue!)).toBe(250000000n);
    expect(onSigned).toHaveBeenCalledOnce();
    expect(rpc.getTransaction).toHaveBeenCalledTimes(2);
    expect(freighter.signTransaction).toHaveBeenCalledWith(expect.any(String), {
      networkPassphrase: sdk.Networks.TESTNET,
      address: SOURCE,
    });
  });

  it("DUPLICATE is polled like PENDING", async () => {
    rpc.sendTransaction.mockResolvedValue(sent("DUPLICATE"));
    rpc.getTransaction.mockResolvedValue({ status: "SUCCESS", txHash: HASH });
    await expect(call()).resolves.toMatchObject({ txHash: HASH });
  });

  it("ERROR throws with the hash and the decoded result code, without polling", async () => {
    rpc.sendTransaction.mockResolvedValue(
      sent("ERROR", { errorResult: txResult(sdk.xdr.TransactionResultResult.txInsufficientBalance()) })
    );
    const err = await failure(call());
    expect(err).toBeInstanceOf(TxError);
    expect(err.kind).toBe("send_error");
    expect(err.txHash).toBe(HASH);
    expect(err.message).toContain(HASH);
    expect(err.message).toContain("txInsufficientBalance");
    expect(describeTxError(err)).toBe(XLM_BALANCE_TOO_LOW_MESSAGE);
    expect(rpc.getTransaction).not.toHaveBeenCalled();
  });

  it("TRY_AGAIN_LATER throws: another transaction of the account is still pending", async () => {
    rpc.sendTransaction.mockResolvedValue(sent("TRY_AGAIN_LATER"));
    const err = await failure(call());
    expect(err.kind).toBe("try_again_later");
    expect(err.message).toMatch(/otra transacción de esta cuenta sigue pendiente/);
    expect(err.message).toContain(HASH);
    expect(describeTxError(err)).toBe(err.message);
    expect(rpc.getTransaction).not.toHaveBeenCalled();
  });
});

describe("signAndSend: polling getTransaction", () => {
  it("still NOT_FOUND when polling ends -> 'estado desconocido' with the hash and the explorer link", async () => {
    rpc.sendTransaction.mockResolvedValue(sent("PENDING"));
    rpc.getTransaction.mockResolvedValue({ status: "NOT_FOUND", txHash: HASH });
    const err = await failure(call());
    expect(err.kind).toBe("unknown_status");
    expect(err.message).toMatch(/estado desconocido/);
    expect(err.message).toContain(HASH);
    expect(err.message).toContain(TX_EXPLORER(HASH));
    expect(txHashOf(err)).toBe(HASH);
    expect(rpc.getTransaction).toHaveBeenCalledTimes(3);
    // Shown as is; never mistaken for a rejection by the purchase modal.
    expect(describeTxError(err)).toBe(err.message);
    expect(REJECTED_BRANCH.test(err.message)).toBe(false);
  });

  it("RPC unreachable while polling -> 'estado desconocido' too", async () => {
    rpc.sendTransaction.mockResolvedValue(sent("PENDING"));
    rpc.getTransaction.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await failure(call());
    expect(err.kind).toBe("unknown_status");
    expect(err.message).toContain(HASH);
  });

  it("sendTransaction network failure: polls the signed hash, it may have landed", async () => {
    rpc.sendTransaction.mockRejectedValue(new TypeError("Failed to fetch"));
    rpc.getTransaction.mockResolvedValue({ status: "SUCCESS" });
    const res = await call();
    expect(res.txHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rpc.getTransaction).toHaveBeenCalledWith(res.txHash);
  });

  it("FAILED with Error(Contract, #11) -> error code 11 (the contract's own error beats the SAC's #10)", async () => {
    rpc.sendTransaction.mockResolvedValue(sent("PENDING"));
    rpc.getTransaction.mockResolvedValue({
      status: "FAILED",
      txHash: HASH,
      resultXdr: trapped(),
      diagnosticEventsXdr: [contractErrorEvent(XLM_SAC, 10), contractErrorEvent(CONTRACT_ID, 11)],
    });
    const err = await failure(call({ method: "purchase_tokens", args: [SOURCE, 1, 5n] }));
    expect(err.kind).toBe("failed");
    expect(parseContractErrorCode(err)).toBe(11);
    expect(err.message).toContain("txFailed/invokeHostFunctionTrapped");
    expect(err.message).toContain(HASH);
    expect(describeTxError(err)).toMatch(/Saldo insuficiente.*#11 InsufficientBalance/);
  });

  it("a submitted transaction clears the read cache, whatever its outcome", async () => {
    const load = vi.fn(async () => 1);
    await cachedRead("probe", load);
    rpc.sendTransaction.mockResolvedValue(sent("PENDING"));
    rpc.getTransaction.mockResolvedValue({ status: "NOT_FOUND" });
    await failure(call());
    await cachedRead("probe", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("signAndSend: Freighter", () => {
  it("rejection { signedTxXdr: '', error } -> rejected error, nothing is sent", async () => {
    freighter.signTransaction.mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { code: -4, message: "The user rejected this request." },
    });
    const err = await failure(call());
    expect(err.kind).toBe("rejected");
    expect(REJECTED_BRANCH.test(errorText(err))).toBe(true);
    expect(describeTxError(err)).toBe("Cancelaste la firma en Freighter. No se envió ninguna transacción.");
    expect(rpc.sendTransaction).not.toHaveBeenCalled();
  });

  it("wrong network: stops before simulating or signing", async () => {
    freighter.getNetworkDetails.mockResolvedValue({ network: "PUBLIC", networkUrl: "", networkPassphrase: sdk.Networks.PUBLIC });
    const err = await failure(call());
    expect(err.kind).toBe("wrong_network");
    expect(err.message).toMatch(/otra red \(PUBLIC\).*Testnet/);
    expect(describeTxError(err)).toBe(err.message);
    expect(rpc.getAccount).not.toHaveBeenCalled();
    expect(freighter.signTransaction).not.toHaveBeenCalled();
  });
});

describe("failure decoding (SDK 17 XDR)", () => {
  it("formats host errors like the host does", () => {
    expect(scErrorText(sdk.xdr.ScError.sceContract(4))).toBe("Error(Contract, #4)");
    expect(scErrorText(sdk.xdr.ScError.sceAuth(sdk.xdr.ScErrorCode.scecInvalidAction))).toBe("Error(Auth, InvalidAction)");
  });

  it("falls back to the last contract error, then to the result codes", () => {
    expect(describeTxFailure(sdk, { events: [contractErrorEvent(XLM_SAC, 10)] }, CONTRACT_ID)).toBe("Error(Contract, #10)");
    expect(describeTxFailure(sdk, { result: trapped() }, CONTRACT_ID)).toBe("txFailed/invokeHostFunctionTrapped");
    expect(describeTxFailure(sdk, {}, CONTRACT_ID)).toBe("sin detalle");
  });
});
