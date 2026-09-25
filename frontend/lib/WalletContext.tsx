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

import { HORIZON_URL, NETWORK_PASSPHRASE } from "./contract";
import { connectFreighter, restoreFreighterAddress, watchFreighterChanges } from "./freighter";
import { clearReadCache } from "./readCache";
import { sendContractCall, type ContractCallResult } from "./transactions";

interface WalletState {
  address: string | null;
  balance: string;
  network: string;
  connected: boolean;
  connecting: boolean;
  /** Short-lived notice shown after Freighter reports the connected account changed. */
  accountChangeNotice: string | null;
  /** Set while Freighter is connected to a network other than testnet; null otherwise. */
  networkWarning: string | null;
}

/** "GABC…WXYZ": short form used in the account-change notice. */
function shortAddress(address: string): string {
  return `${address.slice(0, 1)}…${address.slice(-4)}`;
}

/** How long the account-change notice stays visible before auto-clearing. */
const ACCOUNT_CHANGE_NOTICE_MS = 6_000;

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
    accountChangeNotice: null,
    networkWarning: null,
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
      accountChangeNotice: null,
      networkWarning: null,
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

  // Auto-clear the account-change notice a few seconds after it appears.
  useEffect(() => {
    if (!state.accountChangeNotice) return;
    const timer = setTimeout(() => {
      setState((s) => (s.accountChangeNotice ? { ...s, accountChangeNotice: null } : s));
    }, ACCOUNT_CHANGE_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [state.accountChangeNotice]);

  // Watch Freighter for account/network changes while connected (client-only).
  // `state.address` is deliberately left out of the dependency array: once
  // running, this effect (via the watcher's callback below) is the only thing
  // that moves `state.address` while connected, so restarting it on every
  // address change would just tear down and recreate the same watcher.
  useEffect(() => {
    if (!mounted || !state.connected) return;

    let knownAddress = state.address ?? "";
    let firstTick = true;

    const stopWatching = watchFreighterChanges(
      (change) => {
        // The watcher's very first callback just reports the state Freighter
        // was already in when we started watching (not a real switch): only
        // later callbacks with a different address are an actual account change.
        const addressChanged = !firstTick && !!change.address && change.address !== knownAddress;
        if (change.address) knownAddress = change.address;
        firstTick = false;

        // Stale simulations/reads must not survive an account switch.
        if (addressChanged) clearReadCache();

        const offTestnet = !!change.networkPassphrase && change.networkPassphrase !== NETWORK_PASSPHRASE;

        setState((s) => ({
          ...s,
          address: change.address || s.address,
          accountChangeNotice: addressChanged
            ? `Cuenta de Freighter cambiada a ${shortAddress(change.address)}.`
            : s.accountChangeNotice,
          networkWarning: offTestnet
            ? `Freighter está conectado a otra red${change.network ? ` (${change.network})` : ""}. Esta demo funciona solo en Stellar Testnet.`
            : null,
        }));
      },
      {
        onError: (message) => {
          // Extension locked or briefly unreachable: keep the last known
          // state and just log it, rather than clobbering address/network.
          console.warn("Freighter watch error:", message);
        },
      }
    );

    return stopWatching;
  }, [mounted, state.connected]);

  // createElement rather than JSX: vitest inherits `jsx: preserve` from
  // tsconfig, and this keeps the provider testable (__tests__/wallet-context.test.ts).
  return createElement(
    WalletContext.Provider,
    { value: { ...state, connect, disconnect, signAndSend, fetchBalance } },
    children
  );
}
