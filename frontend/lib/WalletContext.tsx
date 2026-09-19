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
import * as SorobanRpc from "@stellar/stellar-sdk/rpc";
import {
  Address,
  Contract,
  TransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";

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
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: "0",
    balanceUsd: "0.00",
    network: "",
    connected: false,
    connecting: false,
  });

  const fetchBalance = useCallback(async () => {
    if (!state.address) return;
    try {
      const HORIZON_URL =
        process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
        "https://horizon-testnet.stellar.org";
      const res = await fetch(
        `${HORIZON_URL}/accounts/${state.address}`
      );
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

      const server = new SorobanRpc.Server(SERVER_URL);
      const contract = new Contract(contractId);
      const account = await server.getAccount(state.address);

      // Convert Stellar address strings to ScVal for Soroban contract calls
      // contract.call() cannot auto-serialize Address instances — we must
      // explicitly call .toScVal() so the XDR writer receives a proper ScVal.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sorobanArgs = args.map((a: any) => {
        if (typeof a === "string" && /^[GC][A-Z0-9]{55}$/.test(a)) {
          return Address.fromString(a).toScVal();
        }
        return a;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builtTx = contract.call(method, ...(sorobanArgs as any[]));
      const tx = new TransactionBuilder(account, {
        fee: "100000",
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(builtTx)
        .setTimeout(180)
        .build();

      let preparedTx = await server.prepareTransaction(tx);
      const txXdr = preparedTx.toXDR();

      const signed = await signTransaction(txXdr, {
        networkPassphrase: PASSPHRASE,
        address: signWith || state.address,
      });

      const signedTx = TransactionBuilder.fromXDR(
        signed.signedTxXdr,
        PASSPHRASE
      );
      const response = await server.sendTransaction(signedTx);

      if (response.status === "ERROR") {
        // Stellar SDK errorResult contains BigInt values that JSON.stringify can't handle
        let errMsg: string;
        try {
          errMsg = JSON.stringify(response.errorResult, (_key, value) =>
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

  // Auto-reconnect on mount
  useEffect(() => {
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
  }, []);

  // Fetch balance when address changes
  useEffect(() => {
    if (state.address) fetchBalance();
  }, [state.address, fetchBalance]);

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
