/**
 * Signed Soroban contract calls: build -> simulate (prepareTransaction) ->
 * sign in Freighter -> sendTransaction -> poll getTransaction.
 *
 * sendContractCall resolves ONLY after getTransaction answered SUCCESS, so a
 * caller may show success (receipt, PDF, claimed amount) only when it
 * resolves. Every other outcome throws a TxError whose message is ready to
 * show and, once the transaction was signed, carries its hash:
 *   sendTransaction ERROR / TRY_AGAIN_LATER -> the network did not take it;
 *   getTransaction FAILED -> failed on-chain, with the decoded Error(Contract, #N);
 *   no final status after polling (NOT_FOUND or RPC unreachable) -> "estado
 *   desconocido": the payment may still land, check the explorer first.
 */

import type * as StellarSdk from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, RPC_URL, TX_EXPLORER } from "./contract";
import { TxError } from "./contractErrors";
import { assertFreighterNetwork, signWithFreighter } from "./freighter";
import { clearReadCache } from "./readCache";
import { encodeContractArgs } from "./soroban";

type Sdk = typeof StellarSdk;

export type PollOptions = { attempts?: number; intervalMs?: number };

export type ContractCallInput = {
  /** signer and source account */
  source: string;
  contractId: string;
  method: string;
  args: readonly unknown[];
  /** Called once Freighter returned the signature, right before sending. */
  onSigned?: () => void;
  poll?: PollOptions;
};

export type ContractCallResult = { txHash: string; returnValue?: StellarSdk.xdr.ScVal };

/** 30 x 2 s: the time a testnet transaction normally needs, with margin. */
const POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2_000;

export async function sendContractCall(input: ContractCallInput): Promise<ContractCallResult> {
  const sdk = await import("@stellar/stellar-sdk");
  await assertFreighterNetwork(NETWORK_PASSPHRASE);
  const server = new sdk.rpc.Server(RPC_URL);
  const account = await server.getAccount(input.source);
  const op = new sdk.Contract(input.contractId).call(input.method, ...encodeContractArgs(sdk, input.method, input.args));
  const built = new sdk.TransactionBuilder(account, { fee: "100000", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(op)
    .setTimeout(180)
    .build();
  const prepared = await server.prepareTransaction(built);
  const signedXdr = await signWithFreighter(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: input.source,
  });
  const signed = sdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  input.onSigned?.();
  try {
    return await submitAndPoll(sdk, server, signed, input.contractId, input.poll);
  } finally {
    // Whatever the outcome, contract state may have changed: read it again.
    clearReadCache();
  }
}

async function submitAndPoll(
  sdk: Sdk,
  server: StellarSdk.rpc.Server,
  tx: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
  contractId: string,
  poll: PollOptions = {}
): Promise<ContractCallResult> {
  let hash = Array.from(tx.hash(), (b) => b.toString(16).padStart(2, "0")).join("");
  let sent: StellarSdk.rpc.Api.SendTransactionResponse | null = null;
  try {
    sent = await server.sendTransaction(tx);
  } catch (err) {
    // The request may have reached the network anyway: only polling can tell.
    console.warn(`sendTransaction ${hash} failed, polling its status`, err);
  }
  if (sent) {
    hash = sent.hash || hash;
    if (sent.status === "TRY_AGAIN_LATER") {
      throw new TxError(
        "try_again_later",
        `La red no aceptó la transacción por ahora (TRY_AGAIN_LATER): otra transacción de esta cuenta sigue pendiente. Espera unos segundos y vuelve a intentarlo. Hash: ${hash}.`,
        hash
      );
    }
    if (sent.status !== "PENDING" && sent.status !== "DUPLICATE") {
      const detail = describeTxFailure(sdk, { result: sent.errorResult, events: sent.diagnosticEvents }, contractId);
      throw new TxError(
        "send_error",
        `La red rechazó la transacción (${sent.status}: ${detail}); no se incluyó en el ledger. Hash: ${hash}.`,
        hash
      );
    }
  }

  const attempts = poll.attempts ?? POLL_ATTEMPTS;
  const intervalMs = poll.intervalMs ?? POLL_INTERVAL_MS;
  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    let res: StellarSdk.rpc.Api.GetTransactionResponse;
    try {
      res = await server.getTransaction(hash);
    } catch {
      continue; // RPC hiccup: keep polling
    }
    if (res.status === "SUCCESS") return { txHash: hash, returnValue: res.returnValue };
    if (res.status === "FAILED") {
      const detail = describeTxFailure(
        sdk,
        { result: res.resultXdr, events: res.diagnosticEventsXdr, meta: res.resultMetaXdr },
        contractId
      );
      throw new TxError("failed", `La transacción falló on-chain (${detail}). Hash: ${hash}.`, hash);
    }
  }
  throw new TxError(
    "unknown_status",
    `Transacción en estado desconocido: se envió (hash ${hash}), pero la red no confirmó su resultado a tiempo. Antes de reintentar, revisa ${TX_EXPLORER(hash)}: si aparece allí, ya se aplicó y reintentar la repetiría.`,
    hash
  );
}

/** "Error(Contract, #11)", "Error(Auth, InvalidAction)", ... (the host's own notation). */
export function scErrorText(err: StellarSdk.xdr.ScError): string {
  if (err.type === "sceContract") return `Error(Contract, #${err.contractCode})`;
  return `Error(${err.type.slice(3)}, ${err.code.name.slice(4)})`;
}

/**
 * Cause of a rejected or failed transaction, decoded with the SDK 17 XDR
 * classes: the contract error found in the diagnostic events, then the
 * result codes ("txFailed/invokeHostFunctionTrapped"). The invoked
 * contract's own Error(Contract, #N) wins over errors of inner calls (the
 * XLM SAC may report #10 before the contract maps it to #11).
 */
export function describeTxFailure(
  sdk: Sdk,
  parts: {
    result?: StellarSdk.xdr.TransactionResult;
    events?: StellarSdk.xdr.DiagnosticEvent[];
    meta?: StellarSdk.xdr.TransactionMeta;
  },
  contractId: string
): string {
  let own: string | null = null;
  let contract: string | null = null;
  let any: string | null = null;
  for (const d of [...(parts.events ?? []), ...metaDiagnosticEvents(parts.meta)]) {
    const emitter = d.event.contractId ? sdk.StrKey.encodeContract(d.event.contractId.value) : null;
    const { topics, data } = d.event.body.v0;
    for (const v of [...topics, data]) {
      if (v.type !== "scvError") continue;
      const text = scErrorText(v.error);
      any = text;
      if (v.error.type === "sceContract") {
        contract = text;
        if (emitter === contractId) own = text;
      }
    }
  }
  return [own ?? contract ?? any, resultCodes(parts.result)].filter(Boolean).join("; ") || "sin detalle";
}

function metaDiagnosticEvents(meta?: StellarSdk.xdr.TransactionMeta): StellarSdk.xdr.DiagnosticEvent[] {
  if (meta?.type === "v4") return meta.v4.diagnosticEvents;
  if (meta?.type === "v3") return meta.v3.sorobanMeta?.diagnosticEvents ?? [];
  return [];
}

function resultCodes(result?: StellarSdk.xdr.TransactionResult): string {
  if (!result) return "";
  const outer = result.result;
  const inner =
    outer.type === "txFeeBumpInnerFailed" || outer.type === "txFeeBumpInnerSuccess"
      ? outer.innerResultPair.result.result
      : outer;
  const ops = inner.type === "txFailed" || inner.type === "txSuccess" ? inner.results.map(operationCode) : [];
  return [inner.type, ...ops].join("/");
}

function operationCode(op: StellarSdk.xdr.OperationResult): string {
  if (op.type !== "opInner") return op.type;
  return op.tr.type === "invokeHostFunction" ? op.tr.invokeHostFunctionResult.type : op.tr.type;
}
