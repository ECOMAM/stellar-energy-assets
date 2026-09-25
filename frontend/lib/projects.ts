/**
 * On-chain project reads (v2.1): next_project_id, get_project(u64),
 * get_project_name(u64) and get_portfolio(Address, Vec<u64>), plus the pure
 * helpers the project pages route and decide with. Amounts stay bigint
 * stroops; convert with lib/units.
 */

import { parseContractErrorCode } from "./contractErrors";
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

/* ──────────────────── Routing: one static detail page ──────────────────── */

/**
 * URL of a project's detail page. The static export ships a single page,
 * app/project/page.tsx, that reads the id from the query string, so a
 * project created on-chain after the build has a page too.
 */
export function projectHref(id: number): string {
  return `/project/?id=${id}`;
}

/**
 * The `?id=` value of the detail page as a project id: decimal digits only
 * (surrounding spaces ignored), greater than zero and a safe integer. Missing,
 * empty, non-numeric, negative, zero or fractional values give null.
 */
export function parseProjectId(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/* ──────────────────── All projects: ids 1..next_project_id-1 ──────────────────── */

/**
 * Most projects the UI lists: a guard against a corrupt next_project_id, far
 * above what the testnet contract holds. The landing says so if it is hit.
 */
export const MAX_LISTED_PROJECTS = 200;

/** Cards the landing shows before "Ver todos los proyectos". */
export const FEATURED_LIMIT = 6;

/** Projects read at the same time while listing (each read is two simulations). */
const LIST_CONCURRENCY = 6;

/**
 * Every id the contract has assigned: 1..nextProjectId-1 (ids start at 1, go
 * up by one per create_project and are never reused), at most `max`.
 * Anything that is not an integer above 1 gives [].
 */
export function projectIdRange(nextProjectId: number, max: number = MAX_LISTED_PROJECTS): number[] {
  if (!Number.isSafeInteger(nextProjectId) || nextProjectId <= 1) return [];
  const count = Math.max(0, Math.min(nextProjectId - 1, Math.floor(max)));
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** The first `limit` items (FEATURED_LIMIT), or all of them once the list is expanded. */
export function visibleProjects<T>(all: readonly T[], expanded: boolean, limit: number = FEATURED_LIMIT): T[] {
  return expanded ? [...all] : all.slice(0, Math.max(0, limit));
}

/**
 * `fn` over `items` with at most `limit` calls in flight; results keep the
 * input order. The first failure rejects and stops starting new calls.
 */
async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i]);
      } catch (e) {
        failed = true;
        throw e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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

export type OnChainProjectList = {
  /** projects 1..nextProjectId-1 (at most MAX_LISTED_PROJECTS) */
  projects: OnChainProject[];
  nextProjectId: number;
};

/** Every project 1..next_project_id-1. Throws if the RPC is unreachable. */
export async function fetchOnChainProjects(): Promise<OnChainProjectList> {
  const nextProjectId = await fetchNextProjectId();
  const projects = await mapWithConcurrency(projectIdRange(nextProjectId), LIST_CONCURRENCY, fetchOnChainProject);
  return { projects, nextProjectId };
}

/* ──────────────────── Detail page: found, not found or unreachable ──────────────────── */

/** `ProjectNotFound` in the contract's `enum Error`. */
export const PROJECT_NOT_FOUND_CODE = 6;

export type ProjectLookup =
  | { status: "found"; project: OnChainProject }
  /** the chain proved the id does not exist: ProjectNotFound (#6), or id >= next_project_id */
  | { status: "not_found" }
  /** no verdict (RPC down, timeout, anything else): never reported as "not found" */
  | { status: "unreachable"; error: unknown };

/**
 * Verdict from the settled get_project and next_project_id reads. A project
 * that loaded wins; "not found" needs evidence from the chain; every other
 * failure is "unreachable".
 */
export function decideProjectLookup(
  id: number,
  project: PromiseSettledResult<OnChainProject>,
  nextProjectId: PromiseSettledResult<number>
): ProjectLookup {
  if (project.status === "fulfilled") return { status: "found", project: project.value };
  if (parseContractErrorCode(project.reason) === PROJECT_NOT_FOUND_CODE) return { status: "not_found" };
  // next_project_id is at least 1 (the contract defaults to 1): anything else is not evidence.
  const next = nextProjectId.status === "fulfilled" ? nextProjectId.value : null;
  if (next !== null && Number.isSafeInteger(next) && next >= 1 && id >= next) return { status: "not_found" };
  return { status: "unreachable", error: project.reason };
}

/** get_project(id) and next_project_id read together for the detail page. Never throws. */
export async function lookupOnChainProject(id: number): Promise<ProjectLookup> {
  const [project, nextProjectId] = await Promise.allSettled([fetchOnChainProject(id), fetchNextProjectId()]);
  return decideProjectLookup(id, project, nextProjectId);
}

export type ProjectPageState = "not_found" | "loading" | "found" | "unreachable";

/**
 * What the detail page shows. `id` is the parsed `?id=` (null = missing or
 * invalid, decided without any RPC call); `notFound` is a "not_found" lookup.
 * "loading" and "unreachable" are never turned into "not_found": the page
 * shows "Cargando datos on-chain…" or its labelled DEMO fallback instead.
 */
export function projectPageState(s: {
  id: number | null;
  notFound: boolean;
  project: OnChainProject | null;
  loading: boolean;
}): ProjectPageState {
  if (s.id === null || s.notFound) return "not_found";
  if (s.project) return "found";
  return s.loading ? "loading" : "unreachable";
}

/* ──────────────────── Portfolio: get_portfolio in chunks ──────────────────── */

/**
 * Most project ids per get_portfolio call. The view reads every listed project
 * in one simulation, so its footprint grows with the list (docs/security-audit.md,
 * H-08); 12 keeps each call small and more projects take more calls.
 */
export const PORTFOLIO_CHUNK_SIZE = 12;

export type PortfolioPosition = { balance: bigint; claimable: bigint; claimed: bigint };

/** `items` split into consecutive chunks of at most `size` (PORTFOLIO_CHUNK_SIZE). */
export function chunkIds<T>(items: readonly T[], size: number = PORTFOLIO_CHUNK_SIZE): T[][] {
  if (!Number.isSafeInteger(size) || size < 1) throw new RangeError(`Tamaño de bloque inválido: ${size}`);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Add get_portfolio's Vec<Position> (scValToNative form) to `into`, keyed by project id. */
export function parsePortfolio(
  raw: unknown,
  into: Map<number, PortfolioPosition> = new Map()
): Map<number, PortfolioPosition> {
  for (const item of Array.isArray(raw) ? raw : []) {
    const p = (item ?? {}) as Record<string, unknown>;
    into.set(Number(toBigIntOr(p.project_id, ZERO)), {
      balance: toBigIntOr(p.token_balance, ZERO),
      claimable: toBigIntOr(p.claimable_amount, ZERO),
      claimed: toBigIntOr(p.total_claimed, ZERO),
    });
  }
  return into;
}

export type PortfolioReader = (address: string, ids: number[]) => Promise<unknown>;

const readPortfolio: PortfolioReader = (address, ids) => readContractNative("get_portfolio", [address, ids]);

/**
 * Positions of `address` in every project of `ids`: one get_portfolio call
 * per chunk of at most PORTFOLIO_CHUNK_SIZE ids, merged by project id. All or
 * nothing: if any chunk fails the whole read throws, so totals never silently
 * leave projects out.
 */
export async function fetchPortfolio(
  address: string,
  ids: readonly number[],
  read: PortfolioReader = readPortfolio
): Promise<Map<number, PortfolioPosition>> {
  const pages = await Promise.all(chunkIds(ids).map((part) => read(address, part)));
  const merged = new Map<number, PortfolioPosition>();
  for (const page of pages) parsePortfolio(page, merged);
  return merged;
}
