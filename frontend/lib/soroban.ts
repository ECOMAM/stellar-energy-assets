/**
 * Soroban argument encoding for the NIKO SUN v2 contract.
 *
 * Every public function of contracts/niko_project/src/lib.rs is listed with
 * its exact parameter types, so each call site is encoded by signature
 * (u64 project ids, u128 amounts, Address, bool, String) instead of guessing
 * from the JS value. An unknown method or a wrong arity throws before
 * anything reaches the network. There is no `initialize`: the v2 contract is
 * configured by its constructor at deploy time.
 */

import type * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from "./contract";

type Sdk = typeof StellarSdk;

export type ScArgType = "address" | "u64" | "u128" | "bool" | "string" | "vec_u64";

/** Parameter types of every v2 pub fn (the `env` parameter excluded). */
export const CONTRACT_SIGNATURES = {
  set_admin: ["address", "address"],
  set_paused: ["address", "bool"],
  set_issuer: ["address", "address", "bool"],
  set_participant: ["address", "address", "bool"],
  get_admin: [],
  get_token: [],
  is_paused: [],
  is_issuer: ["address"],
  is_participant: ["address"],
  create_project: ["address", "string", "u128", "u128", "u128"],
  purchase_tokens: ["address", "u64", "u128"],
  deposit_revenue: ["address", "u64", "u128", "u128"],
  update_energy: ["address", "u64", "u128"],
  claim_revenue: ["address", "u64"],
  withdraw_sales: ["address", "u64", "u128"],
  get_project: ["u64"],
  get_project_name: ["u64"],
  get_sales_balance: ["u64"],
  get_claimable: ["address", "u64"],
  get_portfolio: ["address", "vec_u64"],
  get_user_projects: ["address"],
  next_project_id: [],
  get_total_sales: [],
  set_project_status: ["address", "u64", "bool"],
  transfer_ownership: ["address", "u64", "address"],
} as const satisfies Record<string, readonly ScArgType[]>;

export type ContractMethod = keyof typeof CONTRACT_SIGNATURES;

const ZERO = BigInt(0);
const ONE = BigInt(1);
const MAX: Record<"u64" | "u128", bigint> = {
  u64: (ONE << BigInt(64)) - ONE,
  u128: (ONE << BigInt(128)) - ONE,
};

export function isContractMethod(method: string): method is ContractMethod {
  return Object.prototype.hasOwnProperty.call(CONTRACT_SIGNATURES, method);
}

/** Validate an unsigned integer argument and return it as bigint. */
export function toUnsigned(value: unknown, type: "u64" | "u128", label: string = type): bigint {
  let v: bigint;
  if (typeof value === "bigint") v = value;
  else if (typeof value === "number" && Number.isSafeInteger(value)) v = BigInt(value);
  else if (typeof value === "string" && /^\d+$/.test(value.trim())) v = BigInt(value.trim());
  else throw new TypeError(`${label}: se esperaba un entero ${type}, llegó ${String(value)}`);
  if (v < ZERO || v > MAX[type]) throw new RangeError(`${label}: ${v} fuera de rango ${type}`);
  return v;
}

function encodeArg(sdk: Sdk, type: ScArgType, value: unknown, label: string): StellarSdk.xdr.ScVal {
  switch (type) {
    case "address":
      if (typeof value !== "string") throw new TypeError(`${label}: se esperaba una dirección Stellar`);
      return sdk.Address.fromString(value).toScVal();
    case "u64":
    case "u128":
      return sdk.nativeToScVal(toUnsigned(value, type, label), { type });
    case "bool":
      if (typeof value !== "boolean") throw new TypeError(`${label}: se esperaba un booleano`);
      return sdk.nativeToScVal(value, { type: "bool" });
    case "string":
      if (typeof value !== "string") throw new TypeError(`${label}: se esperaba un texto`);
      return sdk.nativeToScVal(value, { type: "string" });
    case "vec_u64":
      if (!Array.isArray(value)) throw new TypeError(`${label}: se esperaba una lista de ids u64`);
      return sdk.xdr.ScVal.scvVec(
        value.map((v, i) => sdk.nativeToScVal(toUnsigned(v, "u64", `${label}[${i}]`), { type: "u64" }))
      );
  }
}

/** Encode `args` for `method` according to CONTRACT_SIGNATURES. */
export function encodeContractArgs(sdk: Sdk, method: string, args: readonly unknown[]): StellarSdk.xdr.ScVal[] {
  if (!isContractMethod(method)) {
    throw new Error(`"${method}" no es una función del contrato v2`);
  }
  const spec: readonly ScArgType[] = CONTRACT_SIGNATURES[method];
  if (spec.length !== args.length) {
    throw new Error(`${method} espera ${spec.length} argumentos y recibió ${args.length}`);
  }
  return spec.map((type, i) => encodeArg(sdk, type, args[i], `${method}[${i}]`));
}

/** All-zero ed25519 account: a valid source for read-only simulations. */
export const SIMULATION_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/** Simulate a contract call (no signature, nothing submitted) and return the raw retval. */
export async function simulateContractCall(
  method: string,
  args: readonly unknown[] = [],
  source: string = SIMULATION_SOURCE
): Promise<StellarSdk.xdr.ScVal | undefined> {
  const sdk = await import("@stellar/stellar-sdk");
  const server = new sdk.rpc.Server(RPC_URL);
  const op = new sdk.Contract(CONTRACT_ID).call(method, ...encodeContractArgs(sdk, method, args));
  const tx = new sdk.TransactionBuilder(new sdk.Account(source, "0"), {
    fee: sdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (sdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  return sim.result?.retval;
}

/** Read-only call decoded with scValToNative (u64/u128 -> bigint, Address -> string). */
export async function readContractNative<T = unknown>(method: string, args: readonly unknown[] = []): Promise<T> {
  const sdk = await import("@stellar/stellar-sdk");
  const retval = await simulateContractCall(method, args);
  return (retval === undefined ? undefined : sdk.scValToNative(retval)) as T;
}
