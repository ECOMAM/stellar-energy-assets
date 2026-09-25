/**
 * On-chain project reads (v2.1): next_project_id, get_project(u64),
 * get_project_name(u64). Amounts stay bigint stroops; convert with lib/units.
 */

import { readContractNative } from "./soroban";
import { toBigIntOr } from "./units";

export type OnChainProject = {
  id: number;
  name: string;
  creator: string;
  totalSupply: bigint;
  minted: bigint;
  minPurchase: bigint;
  /** stroops per participation */
  price: bigint;
  active: boolean;
  totalEnergyKwh: bigint;
  /** stroops deposited with deposit_revenue */
  totalRevenue: bigint;
  createdAt: bigint;
};

const ZERO = BigInt(0);

/** Map the scValToNative() form of the `Project` struct to OnChainProject. */
export function parseProject(id: number, raw: unknown, name = ""): OnChainProject {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    id,
    name,
    creator: typeof p.creator === "string" ? p.creator : String(p.creator ?? ""),
    totalSupply: toBigIntOr(p.total_supply, ZERO),
    minted: toBigIntOr(p.minted, ZERO),
    minPurchase: toBigIntOr(p.min_purchase, ZERO),
    price: toBigIntOr(p.price, ZERO),
    active: p.active !== false,
    totalEnergyKwh: toBigIntOr(p.total_energy_kwh, ZERO),
    totalRevenue: toBigIntOr(p.total_revenue, ZERO),
    createdAt: toBigIntOr(p.created_at, ZERO),
  };
}

/** Percentage sold (0-100), integer, from on-chain minted/total_supply. */
export function soldPercent(p: Pick<OnChainProject, "minted" | "totalSupply">): number {
  if (p.totalSupply <= BigInt(0)) return 0;
  return Number((p.minted * BigInt(100)) / p.totalSupply);
}

export async function fetchNextProjectId(): Promise<number> {
  const raw = await readContractNative<unknown>("next_project_id");
  return Number(toBigIntOr(raw, ZERO));
}

export async function fetchOnChainProject(id: number): Promise<OnChainProject> {
  const [raw, name] = await Promise.all([
    readContractNative<unknown>("get_project", [id]),
    readContractNative<unknown>("get_project_name", [id]).catch(() => ""),
  ]);
  return parseProject(id, raw, typeof name === "string" ? name : "");
}

/** All projects 1..next_project_id-1 (capped). Throws if the RPC is unreachable. */
export async function fetchOnChainProjects(maxCount = 12): Promise<OnChainProject[]> {
  const nextId = await fetchNextProjectId();
  const ids: number[] = [];
  for (let i = 1; i < nextId && ids.length < maxCount; i++) ids.push(i);
  return Promise.all(ids.map((id) => fetchOnChainProject(id)));
}
