/**
 * Soroban RPC event reader for the v2 contract.
 *
 * Wire format (contracts/niko_project/src/lib.rs, #[contractevent]): the
 * first topic is the event name as a Symbol, the remaining topics are the
 * #[topic] fields in declaration order, and the data is a map keyed by field
 * name. Examples:
 *   purchase: topics ["purchase", project_id: u64, buyer: Address], data {amount, total_price}
 *   deposit:  topics ["deposit", project_id: u64],                  data {amount, energy_delta}
 *
 * The RPC only keeps a retention window (~120960 ledgers, about 7 days), so
 * startLedger is derived from getHealth().oldestLedger; asking for anything
 * older makes the request fail. It is also raised to the contract's deploy
 * ledger when known, because the RPC scans at most ~10k ledgers per request
 * and answers with an empty page plus a cursor: pages are followed until the
 * cursor reaches latestLedger, even when they come back empty.
 */

import { CONTRACT_DEPLOY_LEDGER, CONTRACT_ID, RPC_URL } from "./contract";
import { toBigInt, type StroopsLike } from "./units";

export type DecodedContractEvent = {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  /** topics decoded with scValToNative: Symbol -> string, u64 -> bigint, Address -> string */
  topics: unknown[];
  /** data decoded with scValToNative: map -> plain object keyed by field name */
  data: unknown;
};

/** Ledgers added to oldestLedger so the window cannot slide past startLedger mid-request. */
const START_MARGIN = 5;

export function computeStartLedger(
  health: { oldestLedger: number; latestLedger: number },
  deployLedger: number | null = CONTRACT_DEPLOY_LEDGER,
  margin = START_MARGIN
): number {
  const floor = Math.max(health.oldestLedger + margin, deployLedger ?? 0, 1);
  return Math.min(floor, health.latestLedger);
}

/** Ledger encoded in a getEvents cursor ("<toid>-<index>", ledger = toid >> 32), or null. */
export function ledgerFromCursor(cursor: string | undefined): number | null {
  const m = /^(\d+)-/.exec(cursor ?? "");
  if (!m) return null;
  return Number(BigInt(m[1]) >> BigInt(32));
}

function isOutOfRange(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /startLedger|ledger range|oldest ledger|out of range/i.test(msg);
}

/**
 * Fetch and decode this contract's events named `name`. `topicSegments` are
 * the matchers for the remaining topics ("*" or base64 ScVal XDR), one per
 * #[topic] field.
 */
export async function fetchContractEvents(
  name: string,
  topicSegments: string[],
  opts: { pageSize?: number; maxPages?: number } = {}
): Promise<DecodedContractEvent[]> {
  const sdk = await import("@stellar/stellar-sdk");
  const server = new sdk.rpc.Server(RPC_URL);
  const pageSize = opts.pageSize ?? 200;
  const maxPages = opts.maxPages ?? 20;
  const nameXdr = sdk.nativeToScVal(name, { type: "symbol" }).toXDR("base64");
  const filters = [{ type: "contract" as const, contractIds: [CONTRACT_ID], topics: [[nameXdr, ...topicSegments]] }];

  const firstPage = async () => {
    const health = await server.getHealth();
    return server.getEvents({ startLedger: computeStartLedger(health), filters, limit: pageSize });
  };

  let page: Awaited<ReturnType<typeof server.getEvents>>;
  try {
    page = await firstPage();
  } catch (err) {
    // The retention window moved between getHealth and getEvents: retry once.
    if (!isOutOfRange(err)) throw err;
    page = await firstPage();
  }

  const out: DecodedContractEvent[] = [];
  for (let n = 0; n < maxPages; n++) {
    for (const evt of page.events) {
      if (evt.inSuccessfulContractCall === false) continue;
      let topics: unknown[];
      let data: unknown;
      try {
        topics = evt.topic.map((t) => sdk.scValToNative(t));
        data = sdk.scValToNative(evt.value);
      } catch {
        continue;
      }
      out.push({
        id: evt.id,
        ledger: evt.ledger,
        ledgerClosedAt: evt.ledgerClosedAt,
        txHash: evt.txHash,
        topics,
        data,
      });
    }
    // An empty or short page does not mean "done": the RPC caps the ledgers
    // scanned per request. Stop only once the cursor reaches latestLedger.
    const cursorLedger = ledgerFromCursor(page.cursor);
    const full = page.events.length >= pageSize;
    if (!page.cursor || (!full && (cursorLedger === null || cursorLedger >= page.latestLedger))) break;
    page = await server.getEvents({ cursor: page.cursor, filters, limit: pageSize });
  }
  return out;
}

/** Base64 XDR of a u64 topic value, to filter events by project id. */
export async function u64TopicXdr(value: number | bigint): Promise<string> {
  const sdk = await import("@stellar/stellar-sdk");
  return sdk.nativeToScVal(BigInt(value), { type: "u64" }).toXDR("base64");
}

export type DepositEvent = {
  projectId: bigint;
  amount: bigint;
  energyDelta: bigint;
  txHash: string;
  ledger: number;
  ledgerClosedAt: string;
};

function big(v: unknown): bigint | null {
  try {
    return v === undefined || v === null ? null : toBigInt(v as StroopsLike);
  } catch {
    return null;
  }
}

/** deposit: topics ["deposit", project_id], data {amount, energy_delta}. */
export function parseDepositEvent(evt: Pick<DecodedContractEvent, "topics" | "data"> & Partial<DecodedContractEvent>): DepositEvent | null {
  const [name, pid] = evt.topics;
  if (evt.topics.length !== 2 || name !== "deposit") return null;
  const projectId = big(pid);
  const d = evt.data as Record<string, unknown> | null;
  if (projectId === null || !d || typeof d !== "object") return null;
  const amount = big(d.amount);
  const energyDelta = big(d.energy_delta);
  if (amount === null || energyDelta === null) return null;
  return {
    projectId,
    amount,
    energyDelta,
    txHash: evt.txHash ?? "",
    ledger: evt.ledger ?? 0,
    ledgerClosedAt: evt.ledgerClosedAt ?? "",
  };
}

/** Revenue deposits of one project inside the RPC retention window, newest first. */
export async function fetchDepositHistory(projectId: number): Promise<DepositEvent[]> {
  const events = await fetchContractEvents("deposit", [await u64TopicXdr(projectId)]);
  return events
    .map(parseDepositEvent)
    .filter((e): e is DepositEvent => e !== null)
    .sort((a, b) => b.ledger - a.ledger);
}
