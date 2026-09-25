import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// freighter-api 6 wrappers: result objects, rejections, timeouts
// ═══════════════════════════════════════════════════════════

const freighter = vi.hoisted(() => ({
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => freighter);

import { TxError, describeTxError, errorText } from "@/lib/contractErrors";
import {
  FREIGHTER_NOT_INSTALLED_MESSAGE,
  WALLET_TIMEOUT_MS,
  assertFreighterNetwork,
  connectFreighter,
  restoreFreighterAddress,
  signWithFreighter,
} from "@/lib/freighter";

const ADDR = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";
const TESTNET = "Test SDF Network ; September 2015";
const PUBLIC = "Public Global Stellar Network ; September 2015";
const REJECTED_BRANCH = /reject|cancel|declin|denied|Request closed/i;
const never = () => new Promise<never>(() => {});
const failure = (p: Promise<unknown>) => p.then(() => expect.fail("should have thrown"), (e: unknown) => e as TxError);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("signWithFreighter", () => {
  const sign = (timeoutMs?: number) => signWithFreighter("AAAA", { networkPassphrase: TESTNET, address: ADDR, timeoutMs });

  it("returns the signed XDR", async () => {
    freighter.signTransaction.mockResolvedValue({ signedTxXdr: "SIGNED", signerAddress: ADDR });
    await expect(sign()).resolves.toBe("SIGNED");
    expect(freighter.signTransaction).toHaveBeenCalledWith("AAAA", { networkPassphrase: TESTNET, address: ADDR });
  });

  it("a rejection resolves to { signedTxXdr: '', error } and becomes a rejected error", async () => {
    freighter.signTransaction.mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { code: -4, message: "The user rejected this request." },
    });
    const err = await failure(sign());
    expect(err).toBeInstanceOf(TxError);
    expect(err.kind).toBe("rejected");
    expect(REJECTED_BRANCH.test(errorText(err))).toBe(true);
    expect(describeTxError(err)).toMatch(/^Cancelaste la firma/);
  });

  it("an empty signedTxXdr without error is a rejection too", async () => {
    freighter.signTransaction.mockResolvedValue({ signedTxXdr: "", signerAddress: "" });
    expect((await failure(sign())).kind).toBe("rejected");
  });

  it("a network complaint from Freighter becomes a wrong-network error", async () => {
    freighter.signTransaction.mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { code: -1, message: "Transaction network passphrase does not match" },
    });
    const err = await failure(sign());
    expect(err.kind).toBe("wrong_network");
    expect(REJECTED_BRANCH.test(err.message)).toBe(false);
  });

  it("leaves the signing phase with an error when Freighter never answers", async () => {
    freighter.signTransaction.mockReturnValue(never());
    const err = await failure(sign(20));
    expect(err.kind).toBe("wallet_timeout");
    expect(describeTxError(err)).toMatch(/no respondió.*No se envió ninguna transacción/);
    expect(REJECTED_BRANCH.test(err.message)).toBe(false);
    expect(WALLET_TIMEOUT_MS).toBe(20_000);
  });
});

describe("assertFreighterNetwork", () => {
  it("throws on another network and passes on testnet or when unknown", async () => {
    freighter.getNetworkDetails.mockResolvedValueOnce({ network: "PUBLIC", networkUrl: "", networkPassphrase: PUBLIC });
    expect((await failure(assertFreighterNetwork(TESTNET))).kind).toBe("wrong_network");
    freighter.getNetworkDetails.mockResolvedValueOnce({ network: "TESTNET", networkUrl: "", networkPassphrase: TESTNET });
    await expect(assertFreighterNetwork(TESTNET)).resolves.toBeUndefined();
    freighter.getNetworkDetails.mockResolvedValueOnce({
      network: "",
      networkUrl: "",
      networkPassphrase: "",
      error: { code: -1, message: "x" },
    });
    await expect(assertFreighterNetwork(TESTNET)).resolves.toBeUndefined();
  });

  it("times out when Freighter never answers", async () => {
    freighter.getNetworkDetails.mockReturnValue(never());
    expect((await failure(assertFreighterNetwork(TESTNET, 20))).kind).toBe("wallet_timeout");
  });
});

describe("connectFreighter", () => {
  it("reads isConnected().isConnected (the result is an object, always truthy)", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    await expect(connectFreighter()).rejects.toThrow(FREIGHTER_NOT_INSTALLED_MESSAGE);
    expect(freighter.requestAccess).not.toHaveBeenCalled();
  });

  it("checks access.error instead of waiting for an address", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({ address: "", error: { code: -4, message: "The user rejected this request." } });
    await expect(connectFreighter()).rejects.toThrow(/no autorizó la conexión/);
  });

  it("times out when requestAccess never answers", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockReturnValue(never());
    const err = await failure(connectFreighter(20));
    expect(err.kind).toBe("wallet_timeout");
  });

  it("returns the granted address", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({ address: ADDR });
    await expect(connectFreighter()).resolves.toBe(ADDR);
  });
});

describe("restoreFreighterAddress (auto-reconnect, no prompt)", () => {
  it("does not read the address when Freighter reports { isConnected: false }", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    freighter.getAddress.mockResolvedValue({ address: ADDR });
    await expect(restoreFreighterAddress()).resolves.toBeNull();
    expect(freighter.getAddress).not.toHaveBeenCalled();
  });

  it("returns the shared address, or null on error", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValueOnce({ address: ADDR });
    await expect(restoreFreighterAddress()).resolves.toBe(ADDR);
    freighter.getAddress.mockResolvedValueOnce({ address: "", error: { code: -3, message: "not allowed" } });
    await expect(restoreFreighterAddress()).resolves.toBeNull();
  });
});
