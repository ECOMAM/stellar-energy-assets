"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getAddress,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

const SERVER_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
  "Test SDF Future Network ; October 2022";
const XLM_TO_USD = 0.13;

interface WalletState {
  address: string | null;
  balance: string;
  balanceUsd: string;
  network: string;
  connected: boolean;
  connecting: boolean;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSend: (
    contractId: string,
    method: string,
    args: unknown[],
    signWith?: string
  ) => Promise<{ txHash: string; result?: unknown }>;
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
    balanceUsd: "0.00",
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
      const HORIZON_URL =
        process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
        "https://horizon-testnet.stellar.org";
      const res = await fetch(`${HORIZON_URL}/accounts/${state.address}`);
      if (!res.ok) return;
      const data = await res.json();
      const native = data.balances?.find(
        (b: { asset_type: string }) => b.asset_type === "native"
      );
      if (native) {
        const bal = native.balance;
        const usd = (parseFloat(bal) * XLM_TO_USD).toFixed(2);
        setState((s) => ({
          ...s,
          balance: parseFloat(bal).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          }),
          balanceUsd: usd,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, [state.address]);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error(
          "Freighter no está instalado. Instálalo desde https://freighter.app"
        );
      }
      const access = await requestAccess();
      if (access.address) {
        setState((s) => ({
          ...s,
          address: access.address,
          connected: true,
          network: "testnet",
          connecting: false,
        }));
      }
    } catch (err) {
      console.error("Wallet connect error:", err);
      setState((s) => ({ ...s, connecting: false }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: "0",
      balanceUsd: "0.00",
      network: "",
      connected: false,
      connecting: false,
    });
  }, []);

  const signAndSend = useCallback(
    async (
      contractId: string,
      method: string,
      args: unknown[],
      signWith?: string
    ) => {
      if (!state.address) throw new Error("Wallet not connected");

      // Lazy-load Stellar SDK — it uses BigInt internally which crashes SSR.
      // Dynamic import ensures it only loads on the client.
      const sdk = await import("@stellar/stellar-sdk");
      const SorobanRpc = await import("@stellar/stellar-sdk/rpc");

      const server = new SorobanRpc.Server(SERVER_URL);
      const contract = new sdk.Contract(contractId);
      const account = await server.getAccount(state.address);

      // Convert Stellar address strings to ScVal for Soroban contract calls
      const sorobanArgs = args.map((a: unknown) => {
        if (typeof a === "string" && /^[GC][A-Z0-9]{55}$/.test(a)) {
          return sdk.Address.fromString(a).toScVal();
        }
        return a;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builtTx = contract.call(method, ...(sorobanArgs as any[]));
      const tx = new sdk.TransactionBuilder(account, {
        fee: "100000",
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(builtTx)
        .setTimeout(180)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const txXdr = preparedTx.toXDR();

      const signed = await signTransaction(txXdr, {
        networkPassphrase: PASSPHRASE,
        address: signWith || state.address,
      });

      const signedTx = sdk.TransactionBuilder.fromXDR(
        signed.signedTxXdr,
        PASSPHRASE
      );
      const response = await server.sendTransaction(signedTx);

      if (response.status === "ERROR") {
        // Stellar SDK errorResult contains BigInt — serialize safely
        let errMsg: string;
        try {
          errMsg = JSON.stringify(
            response.errorResult,
            (_key, value) =>
              typeof value === "bigint" ? value.toString() : value
          );
        } catch {
          errMsg = String(response.errorResult);
        }
        throw new Error(`Transaction failed: ${errMsg}`);
      }

      // Poll for result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          result = await server.getTransaction(response.hash);
          if (result.status !== "NOT_FOUND") break;
        } catch {
          // continue polling
        }
      }

      return {
        txHash: response.hash,
        result: result?.result,
      };
    },
    [state.address]
  );

  // Auto-reconnect on mount (client-only)
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          const access = await getAddress();
          if (access.address) {
            setState((s) => ({
              ...s,
              address: access.address,
              connected: true,
              network: "testnet",
            }));
          }
        }
      } catch {
        // Freighter not available
      }
    })();
  }, [mounted]);

  // Fetch balance when address changes (client-only)
  useEffect(() => {
    if (mounted && state.address) fetchBalance();
  }, [mounted, state.address, fetchBalance]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        signAndSend,
        fetchBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
