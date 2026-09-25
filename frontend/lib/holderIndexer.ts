/**
 * Holder Indexer — Stellar Testnet (Soroban RPC), contract v2.1.
 *
 * Strategy (MVP without a database):
 * 1. Read the v2 `purchase` events of CONTRACT_ID with getEvents. Wire format
 *    (lib.rs, TokensPurchased): topics ["purchase", project_id: u64,
 *    buyer: Address], data map {amount: u128, total_price: u128}.
 *    startLedger comes from getHealth().oldestLedger (the RPC keeps ~7 days).
 * 2. Candidates = buyers seen in those events + the approved demo
 *    participants (seed) + addresses discovered in earlier runs.
 * 3. Each candidate is confirmed on-chain with get_portfolio: a holder is an
 *    account with token_balance > 0 (purchases older than the retention
 *    window are still counted this way).
 * 4. Cached in localStorage `niko-holder-cache`. Never throws.
 */

import { CONTRACT_ID, DEMO_PARTICIPANTS } from "./contract";
import { fetchContractEvents, type DecodedContractEvent } from "./events";
import { readContractNative } from "./soroban";
import { toBigIntOr } from "./units";

const CACHE_KEY = "niko-holder-cache";
const KNOWN_ADDR_KEY = "niko-known-addresses";
/** Reuse a fresh result for this long (several components poll the same data). */
const MEMO_MS = 15_000;

/** Seed fallback: the participants approved on-chain in the demo cycle. */
const SEED_ADDRESSES: readonly string[] = DEMO_PARTICIPANTS;

function isValidAddress(a: string): boolean {
  return /^[GC][A-Z2-7]{55}$/.test(a);
}

export type HolderMetrics = {
  holderCount: number | null;
  activeHolders?: number | null;
  totalTransfers?: number | null;
  lastIndexedAt: string;
  source: "Stellar Testnet";
  isStale?: boolean;
  status: "indexed" | "indexing" | "stale" | "error";
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatHolderCount(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

export function formatLastIndexed(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    // Use UTC explicitly. Example: "24 Sep 2026 · 01:32 UTC"
    const dtf = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
    const parts = dtf.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const month = get("month");
    const monthShort = month === "Sept" ? "Sep" : month;
    return `${get("day")} ${monthShort} ${get("year")} · ${get("hour")}:${get("minute")} UTC`;
  } catch {
    return "—";
  }
}

/** Relative time helper for the verification panel, e.g. "18 sec ago". */
export function formatRelativeTime(isoString: string): string {
  try {
    const then = new Date(isoString).getTime();
    if (isNaN(then)) return "";
    const sec = Math.floor((Date.now() - then) / 1000);
    if (sec < 60) return `${sec} sec ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// v2 `purchase` event parsing
// ---------------------------------------------------------------------------

export type PurchaseEvent = {
  projectId: bigint;
  buyer: string;
  amount: bigint;
  /** stroops paid */
  totalPrice: bigint;
  txHash?: string;
  ledger?: number;
};

/**
 * Parse one decoded (scValToNative) `purchase` event:
 * topics ["purchase", project_id, buyer], data {amount, total_price}.
 * Returns null for any other event or malformed payload.
 */
export function parsePurchaseEvent(
  evt: Pick<DecodedContractEvent, "topics" | "data"> & Partial<DecodedContractEvent>
): PurchaseEvent | null {
  if (!Array.isArray(evt.topics) || evt.topics.length !== 3) return null;
  const [name, pid, buyer] = evt.topics;
  if (name !== "purchase") return null;
  const projectId = toBigIntOr(pid, null);
  if (projectId === null || typeof buyer !== "string" || !isValidAddress(buyer)) return null;
  const d = evt.data as Record<string, unknown> | null;
  if (!d || typeof d !== "object") return null;
  const amount = toBigIntOr(d.amount, null);
  const totalPrice = toBigIntOr(d.total_price, null);
  if (amount === null || totalPrice === null) return null;
  return { projectId, buyer, amount, totalPrice, txHash: evt.txHash, ledger: evt.ledger };
}

/** Participations bought per buyer (sum of `amount` over all projects). */
export function aggregatePurchases(events: PurchaseEvent[]): Map<string, bigint> {
  const balances = new Map<string, bigint>();
  for (const e of events) {
    balances.set(e.buyer, (balances.get(e.buyer) ?? BigInt(0)) + e.amount);
  }
  return balances;
}

// ---------------------------------------------------------------------------
// localStorage cache
// ---------------------------------------------------------------------------

function readCache(): HolderMetrics | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HolderMetrics;
    if (!parsed || typeof parsed.lastIndexedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(metrics: HolderMetrics): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(metrics));
  } catch {
    // ignore quota errors
  }
}

function readKnownAddresses(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_ADDR_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((a): a is string => typeof a === "string" && isValidAddress(a));
  } catch {
    return [];
  }
}

function writeKnownAddresses(addrs: string[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const uniq = Array.from(new Set(addrs.filter(isValidAddress)));
    window.localStorage.setItem(KNOWN_ADDR_KEY, JSON.stringify(uniq.slice(0, 100)));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// On-chain confirmation
// ---------------------------------------------------------------------------

async function fetchProjectIds(): Promise<number[]> {
  const next = Number(toBigIntOr(await readContractNative("next_project_id"), BigInt(1)));
  const ids: number[] = [];
  for (let i = 1; i < next && ids.length < 12; i++) ids.push(i);
  return ids;
}

type Position = { token_balance?: unknown; claimable_amount?: unknown };

/** get_portfolio(addr, ids) -> total balance and whether anything is claimable. */
async function probeHolder(addr: string, ids: number[]): Promise<{ balance: bigint; claimable: boolean }> {
  const positions = await readContractNative<Position[]>("get_portfolio", [addr, ids]);
  let balance = BigInt(0);
  let claimable = false;
  for (const p of Array.isArray(positions) ? positions : []) {
    balance += toBigIntOr(p.token_balance, BigInt(0));
    if (toBigIntOr(p.claimable_amount, BigInt(0)) > BigInt(0)) claimable = true;
  }
  return { balance, claimable };
}

// ---------------------------------------------------------------------------
// Main indexer
// ---------------------------------------------------------------------------

let memo: { at: number; value: Promise<HolderMetrics> } | null = null;

export function getHolderCount(): Promise<HolderMetrics> {
  const now = Date.now();
  if (memo && now - memo.at < MEMO_MS) return memo.value;
  const value = indexHolders();
  memo = { at: now, value };
  return value;
}

async function indexHolders(): Promise<HolderMetrics> {
  const nowIso = new Date().toISOString();
  try {
    // 1) v2 purchase events inside the RPC retention window.
    let purchases: PurchaseEvent[] = [];
    let eventsOk = false;
    try {
      const events = await fetchContractEvents("purchase", ["*", "*"]);
      purchases = events.map(parsePurchaseEvent).filter((e): e is PurchaseEvent => e !== null);
      eventsOk = true;
    } catch (e) {
      console.warn(`holderIndexer: getEvents failed for ${CONTRACT_ID.slice(0, 6)}, using seed probes`, e);
    }
    const fromEvents = aggregatePurchases(purchases);

    // 2) Candidates: event buyers + seed participants + previously seen holders.
    const candidates = Array.from(
      new Set([...fromEvents.keys(), ...SEED_ADDRESSES, ...readKnownAddresses()].filter(isValidAddress))
    );

    // 3) Confirm balances on-chain.
    let ids: number[] = [];
    try {
      ids = await fetchProjectIds();
    } catch {
      ids = [];
    }
    const holders: string[] = [];
    let active = 0;
    let probesOk = 0;
    if (ids.length > 0) {
      const results = await Promise.all(
        candidates.map(async (addr) => {
          try {
            return { addr, ...(await probeHolder(addr, ids)) };
          } catch {
            return null;
          }
        })
      );
      for (const r of results) {
        if (!r) continue;
        probesOk++;
        if (r.balance > BigInt(0)) {
          holders.push(r.addr);
          if (r.claimable) active++;
        }
      }
    }

    let holderCount: number | null;
    let activeHolders: number | null;
    if (probesOk > 0) {
      holderCount = holders.length;
      activeHolders = active;
    } else if (eventsOk) {
      // RPC reads failed but the events were parsed: count distinct buyers.
      holderCount = fromEvents.size;
      activeHolders = null;
    } else {
      throw new Error("no events and no on-chain probes");
    }

    writeKnownAddresses([...holders, ...fromEvents.keys(), ...readKnownAddresses()]);
    const metrics: HolderMetrics = {
      holderCount,
      activeHolders,
      totalTransfers: eventsOk ? purchases.length : null,
      lastIndexedAt: nowIso,
      source: "Stellar Testnet",
      status: "indexed",
      isStale: false,
    };
    writeCache(metrics);
    return metrics;
  } catch (err) {
    console.warn("holderIndexer failed", err);
    const cached = readCache();
    if (cached) return { ...cached, isStale: true, status: "stale" };
    return { holderCount: null, lastIndexedAt: nowIso, source: "Stellar Testnet", status: "indexing" };
  }
}
