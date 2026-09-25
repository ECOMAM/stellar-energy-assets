import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// WalletProvider: connect state and auto-reconnect (freighter-api 6)
// ═══════════════════════════════════════════════════════════

const freighter = vi.hoisted(() => {
  // Minimal fake of freighter-api 6's WatchWalletChanges: records every
  // instance created so tests can grab the one WalletContext started, hand
  // it a synthetic tick via `.cb(...)`, and assert `.stopped` after
  // disconnect/unmount. Unlike the real class, `.watch()` never fires on its
  // own: tests trigger ticks explicitly, including the "first tick" that the
  // real extension would send immediately (WalletContext treats it as a sync,
  // not a change — see lib/freighter.ts).
  const watchInstances: Array<{
    timeout: number;
    cb: ((params: { address: string; network: string; networkPassphrase: string; error?: { code: number; message: string } }) => void) | null;
    stopped: boolean;
  }> = [];
  class WatchWalletChanges {
    timeout: number;
    cb: ((params: { address: string; network: string; networkPassphrase: string; error?: { code: number; message: string } }) => void) | null = null;
    stopped = false;
    constructor(timeout = 3000) {
      this.timeout = timeout;
      watchInstances.push(this);
    }
    watch(cb: NonNullable<(typeof watchInstances)[number]["cb"]>) {
      this.cb = cb;
      return {};
    }
    stop() {
      this.stopped = true;
    }
  }
  return {
    getNetworkDetails: vi.fn(),
    signTransaction: vi.fn(),
    isConnected: vi.fn(),
    requestAccess: vi.fn(),
    getAddress: vi.fn(),
    WatchWalletChanges,
    watchInstances,
  };
});

vi.mock("@stellar/freighter-api", () => freighter);

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NETWORK_PASSPHRASE } from "@/lib/contract";
import { WalletProvider, useWallet } from "@/lib/WalletContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ADDR = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";
const OTHER_ADDR = "GAP552XX3ZGQ7EXSICT7PHVXTK43ZPNVJ6LJZ7HFSZYGNEHEUBM3ST46";
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";

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

/** Mount, connect with ADDR, and return the wallet accessor plus the watcher WalletContext started. */
async function connectWallet() {
  freighter.isConnected.mockResolvedValue({ isConnected: true });
  freighter.getAddress.mockResolvedValue({ address: "" });
  freighter.requestAccess.mockResolvedValue({ address: ADDR });
  const wallet = await mountWallet();
  await act(async () => {
    await wallet().connect();
  });
  const watcher = freighter.watchInstances.at(-1);
  if (!watcher) throw new Error("WalletContext did not start a watcher on connect");
  return { wallet, watcher };
}

beforeEach(() => {
  vi.resetAllMocks();
  freighter.watchInstances.length = 0;
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

  // ═══════════════════════════════════════════════════════════
  // Freighter account/network watcher (freighter-api 6 WatchWalletChanges)
  // ═══════════════════════════════════════════════════════════

  it("an account change updates the address, clears the read cache, shows a notice, and refreshes the balance", async () => {
    const { wallet, watcher } = await connectWallet();
    const fetchSpy = vi.spyOn(global, "fetch");

    // The watcher's first tick just syncs the already-known address: not a change.
    await act(async () => {
      watcher.cb!({ address: ADDR, network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    });
    expect(wallet().accountChangeNotice).toBeNull();

    // A later tick reporting a different address is a genuine account switch.
    await act(async () => {
      watcher.cb!({ address: OTHER_ADDR, network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    });

    expect(wallet().address).toBe(OTHER_ADDR);
    expect(wallet().accountChangeNotice).toBe("Cuenta de Freighter cambiada a G…ST46.");
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(OTHER_ADDR));
    fetchSpy.mockRestore();
  });

  it("a network change away from testnet sets a warning; back on testnet clears it", async () => {
    const { wallet, watcher } = await connectWallet();

    await act(async () => {
      watcher.cb!({ address: ADDR, network: "PUBLIC", networkPassphrase: PUBLIC_PASSPHRASE });
    });
    expect(wallet().networkWarning).toMatch(/otra red \(PUBLIC\)/);

    await act(async () => {
      watcher.cb!({ address: ADDR, network: "TESTNET", networkPassphrase: NETWORK_PASSPHRASE });
    });
    expect(wallet().networkWarning).toBeNull();
  });

  it("stops the watcher on disconnect", async () => {
    const { wallet, watcher } = await connectWallet();
    expect(watcher.stopped).toBe(false);

    await act(async () => {
      wallet().disconnect();
    });
    expect(watcher.stopped).toBe(true);
  });

  it("stops the watcher on unmount", async () => {
    const { watcher } = await connectWallet();
    expect(watcher.stopped).toBe(false);

    await act(async () => root?.unmount());
    root = null;
    expect(watcher.stopped).toBe(true);
  });
});
