"use client";

/* ── BigInt guard: MUST be first import. Patches JSON.stringify globally so
   the Stellar SDK's internal calls don't crash on BigInt values. ── */
import "./bigint-guard";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { HORIZON_URL } from "./contract";
import { connectFreighter, restoreFreighterAddress } from "./freighter";
import { sendContractCall, type ContractCallResult } from "./transactions";

interface WalletState {
  address: string | null;
  balance: string;
  network: string;
  connected: boolean;
  connecting: boolean;
}

export type SignAndSendOptions = {
  /** Called once Freighter returned the signature, before the transaction is sent. */
  onSigned?: () => void;
};

/**
 * Sign and submit one contract call. Resolves only when the transaction
 * reached SUCCESS on-chain; otherwise throws (see lib/transactions.ts).
 */
export type SignAndSend = (
  contractId: string,
  method: string,
  args: unknown[],
  opts?: SignAndSendOptions
) => Promise<ContractCallResult>;

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSend: SignAndSend;
  fetchBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: "0",
    network: "",
    connected: false,
    connecting: false,
  });

  // Mark as mounted on client only
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!state.address) return;
    try {
      const res = await fetch(`${HORIZON_URL}/accounts/${state.address}`);
      if (!res.ok) return;
      const data = await res.json();
      const native = data.balances?.find(
        (b: { asset_type: string }) => b.asset_type === "native"
      );
      if (native) {
        const bal = native.balance;
        setState((s) => ({
          ...s,
          balance: parseFloat(bal).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          }),
        }));
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, [state.address]);

  // Throws on rejection, timeout or missing extension; `connecting` is always reset.
  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      const address = await connectFreighter();
      setState((s) => ({ ...s, address, connected: true, network: "testnet" }));
    } catch (err) {
      console.error("Wallet connect error:", err);
      throw err;
    } finally {
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: "0",
      network: "",
      connected: false,
      connecting: false,
    });
  }, []);

  const signAndSend = useCallback<SignAndSend>(
    async (contractId, method, args, opts = {}) => {
      if (!state.address) throw new Error("Wallet not connected");
      return sendContractCall({ source: state.address, contractId, method, args, onSigned: opts.onSigned });
    },
    [state.address]
  );

  // Auto-reconnect on mount (client-only), without prompting
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    restoreFreighterAddress()
      .then((address) => {
        if (!cancelled && address) {
          setState((s) => ({ ...s, address, connected: true, network: "testnet" }));
        }
      })
      .catch(() => {
        // Freighter not available
      });
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  // Fetch balance when address changes (client-only)
  useEffect(() => {
    if (mounted && state.address) fetchBalance();
  }, [mounted, state.address, fetchBalance]);

  // createElement rather than JSX: vitest inherits `jsx: preserve` from
  // tsconfig, and this keeps the provider testable (__tests__/wallet-context.test.ts).
  return createElement(
    WalletContext.Provider,
    { value: { ...state, connect, disconnect, signAndSend, fetchBalance } },
    children
  );
}
