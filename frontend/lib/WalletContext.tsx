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

import {
  HORIZON_URL,
  NETWORK_PASSPHRASE as PASSPHRASE,
  RPC_URL as SERVER_URL,
} from "./contract";
import { encodeContractArgs, SIMULATION_SOURCE } from "./soroban";

interface WalletState {
  address: string | null;
  balance: string;
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
  /** Read-only contract call (simulates, doesn't submit). */
  readContract: (
    contractId: string,
    method: string,
    args?: unknown[]
  ) => Promise<unknown>;
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
      network: "",
      connected: false,
      connecting: false,
    });
  }, []);

  // ── Shared helper: encode args by the v2 signature of `method` ──
  // (lib/soroban.ts CONTRACT_SIGNATURES: u64 project ids, u128 amounts,
  // Address, bool, String). Unknown methods or wrong arity throw here.
  const toScVals = useCallback(async (args: unknown[], method: string) => {
    const sdk = await import("@stellar/stellar-sdk");
    return encodeContractArgs(sdk, method, args);
  }, []);

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

      // `returnValue` is the contract's return ScVal (e.g. the u128 paid by
      // claim_revenue); decode it with scValToNative.
      return { txHash: response.hash, result: result?.returnValue ?? result?.result };
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
      // Soroban allows exactly one InvokeHostFunction operation per
      // transaction, so a "batch" can only carry a single contract call.
      if (calls.length !== 1) {
        throw new Error(
          "Soroban solo admite una llamada a contrato por transacción: envía cada llamada por separado"
        );
      }

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

  // Read-only contract call — simulates the transaction without submitting
  const readContract = useCallback(
    async (contractId: string, method: string, args: unknown[] = []) => {
      const sdk = await import("@stellar/stellar-sdk");
      const server = new sdk.rpc.Server(SERVER_URL);
      const contract = new sdk.Contract(contractId);
      const sorobanArgs = await toScVals(args, method);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const op = contract.call(method, ...(sorobanArgs as any[]));
      const source = new sdk.Account(state.address || SIMULATION_SOURCE, "0");
      const tx = new sdk.TransactionBuilder(source, {
        fee: "100",
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const result = await server.simulateTransaction(tx);
      if (sdk.rpc.Api.isSimulationError(result)) {
        throw new Error(`Simulation failed: ${result.error}`);
      }
      return result.result?.retval;
    },
    [state.address, toScVals]
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
        readContract,
        fetchBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
