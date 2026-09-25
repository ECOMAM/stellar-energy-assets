import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// WalletProvider: connect state and auto-reconnect (freighter-api 6)
// ═══════════════════════════════════════════════════════════

const freighter = vi.hoisted(() => ({
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => freighter);

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WalletProvider, useWallet } from "@/lib/WalletContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ADDR = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";

let root: Root | null = null;

/** Mount WalletProvider and let its mount effects (auto-reconnect) settle. */
async function mountWallet() {
  let ctx: ReturnType<typeof useWallet> | null = null;
  function Probe() {
    ctx = useWallet();
    return null;
  }
  root = createRoot(document.createElement("div"));
  await act(async () => {
    root!.render(createElement(WalletProvider, { children: createElement(Probe) }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return () => ctx!;
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
});

describe("WalletProvider", () => {
  it("auto-reconnect honours { isConnected: false } (the object itself is truthy)", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    freighter.getAddress.mockResolvedValue({ address: ADDR });
    const wallet = await mountWallet();
    expect(wallet().connected).toBe(false);
    expect(freighter.getAddress).not.toHaveBeenCalled();
  });

  it("connect(): a rejection throws and never leaves `connecting` stuck", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: "" });
    freighter.requestAccess.mockResolvedValue({ address: "", error: { code: -4, message: "The user rejected this request." } });
    const wallet = await mountWallet();
    let thrown: unknown = null;
    await act(async () => {
      await wallet().connect().catch((e: unknown) => {
        thrown = e;
      });
    });
    expect(String(thrown)).toMatch(/no autorizó la conexión/);
    expect(wallet().connecting).toBe(false);
    expect(wallet().connected).toBe(false);
  });

  it("connect(): success stores the address and resets `connecting`", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: "" });
    freighter.requestAccess.mockResolvedValue({ address: ADDR });
    const wallet = await mountWallet();
    await act(async () => {
      await wallet().connect();
    });
    expect(wallet()).toMatchObject({ address: ADDR, connected: true, connecting: false });
  });

  it("signAndSend refuses to run without a wallet", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    const wallet = await mountWallet();
    await expect(wallet().signAndSend("C", "claim_revenue", [])).rejects.toThrow("Wallet not connected");
    expect(freighter.signTransaction).not.toHaveBeenCalled();
  });
});
