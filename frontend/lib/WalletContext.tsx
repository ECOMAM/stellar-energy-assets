"use client";

/* ── BigInt guard: MUST be first import. Patches JSON.stringify globally so
   the Stellar SDK's internal calls don't crash on BigInt values. ── */
import "./bigint-guard";

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

/** A single Soroban contract call descriptor for batch transactions. */
export interface ContractCall {
  contractId: string;
  method: string;
  args: unknown[];
}

type SorobanScValType = "address" | "string" | "u64" | "u128";

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSend: (
    contractId: string,
    method: string,
    args: unknown[],
    signWith?: string
  ) => Promise<{ txHash: string; result?: unknown }>;
  /** Build one transaction with multiple Soroban contract calls and sign+send it. */
  signAndSendBatch: (
    calls: ContractCall[],
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

  // ── Shared helper: convert args to ScVal ──
  const toScVals = useCallback(
    async (args: unknown[], method?: string) => {
      const sdk = await import("@stellar/stellar-sdk");
      return args.map((a: unknown, index: number) => {
        if (typeof a === "string" && /^[GC][A-Z0-9]{55}$/.test(a)) {
          return sdk.Address.fromString(a).toScVal();
        }

        if (typeof a === "bigint" || typeof a === "number") {
          const expectedType =
            method === "purchase_tokens" && index === 1
              ? "u64"
              : "u128";

          if (expectedType === "u64") {
            return sdk.nativeToScVal(BigInt(a.toString()), { type: "u64" });
          }

          return sdk.nativeToScVal(BigInt(a.toString()), { type: "u128" });
        }

        if (typeof a === "string") {
          return sdk.nativeToScVal(a, { type: "string" });
        }
        return a;
      });
    },
    []
  );

  // ── Shared helper: build, sign, send, poll ──
  const buildSignSendPoll = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (operations: any[], signWith?: string) => {
      const sdk = await import("@stellar/stellar-sdk");

      const server = new sdk.rpc.Server(SERVER_URL);
      const account = await server.getAccount(state.address!);

      const tx = new sdk.TransactionBuilder(account, {
        fee: String(operations.length * 100000),
        networkPassphrase: PASSPHRASE,
      });
      for (const op of operations) {
        tx.addOperation(op);
      }
      const builtTx = tx.setTimeout(180).build();

      const preparedTx = await server.prepareTransaction(builtTx);
      const txXdr = preparedTx.toXDR();

      const signed = await signTransaction(txXdr, {
        networkPassphrase: PASSPHRASE,
        address: signWith || state.address!,
      });

      const signedTx = sdk.TransactionBuilder.fromXDR(
        signed.signedTxXdr,
        PASSPHRASE
      );
      const response = await server.sendTransaction(signedTx);

      if (response.status === "ERROR") {
        let errMsg: string;
        try {
          errMsg = JSON.stringify(
            response.errorResult,
            (_key: string, value: unknown) =>
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

      // Throw on on-chain failure (e.g. contract panic)
      if (result?.status === "FAILED") {
        let detail: string;
        try {
          detail = JSON.stringify(
            result.result,
            (_key: string, value: unknown) =>
              typeof value === "bigint" ? value.toString() : value
          );
        } catch {
          detail = String(result.result);
        }
        throw new Error(`Transaction failed on-chain: ${detail}`);
      }

      return { txHash: response.hash, result: result?.result };
    },
    [state.address]
  );

  const signAndSend = useCallback(
    async (
      contractId: string,
      method: string,
      args: unknown[],
      signWith?: string
    ) => {
      if (!state.address) throw new Error("Wallet not connected");

      const sdk = await import("@stellar/stellar-sdk");
      const contract = new sdk.Contract(contractId);
      const sorobanArgs = await toScVals(args, method);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const op = contract.call(method, ...(sorobanArgs as any[]));
      return buildSignSendPoll([op], signWith);
    },
    [state.address, toScVals, buildSignSendPoll]
  );

  const signAndSendBatch = useCallback(
    async (calls: ContractCall[], signWith?: string) => {
      if (!state.address) throw new Error("Wallet not connected");

      const sdk = await import("@stellar/stellar-sdk");

      // Build one operation per call, all in the same transaction
      const ops = [];
      for (const call of calls) {
        const contract = new sdk.Contract(call.contractId);
        const sorobanArgs = await toScVals(call.args, call.method);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ops.push(contract.call(call.method, ...(sorobanArgs as any[])));
      }

      return buildSignSendPoll(ops, signWith);
    },
    [state.address, toScVals, buildSignSendPoll]
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
        signAndSendBatch,
        fetchBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
