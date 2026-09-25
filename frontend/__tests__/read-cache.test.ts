// @vitest-environment node
// (event filters are serialized to XDR; see __tests__/setup.ts)
import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// Read cache: identical RPC reads are deduplicated across components
// ═══════════════════════════════════════════════════════════

const rpc = vi.hoisted(() => ({
  simulateTransaction: vi.fn(),
  getHealth: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  class FakeServer {
    simulateTransaction = rpc.simulateTransaction;
    getHealth = rpc.getHealth;
    getEvents = rpc.getEvents;
  }
  return { ...actual, rpc: { ...actual.rpc, Server: FakeServer } };
});

import * as sdk from "@stellar/stellar-sdk";
import { fetchContractEvents } from "@/lib/events";
import { READ_TTL_MS, cachedRead, clearReadCache, readKey } from "@/lib/readCache";
import { readContractNative } from "@/lib/soroban";

beforeEach(() => {
  clearReadCache();
  vi.resetAllMocks();
});

describe("cachedRead", () => {
  it("deduplicates concurrent identical reads", async () => {
    let resolve!: (v: number) => void;
    const load = vi.fn(() => new Promise<number>((r) => (resolve = r)));
    const a = cachedRead("k", load);
    const b = cachedRead("k", load);
    expect(load).toHaveBeenCalledTimes(1);
    resolve(42);
    await expect(Promise.all([a, b])).resolves.toEqual([42, 42]);
    // Within the TTL a later read reuses the settled value.
    await expect(cachedRead("k", load)).resolves.toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
    expect(READ_TTL_MS).toBe(30_000);
  });

  it("keys on method and args, bigint-safe", () => {
    expect(readKey("simulate", "get_project", [1])).not.toBe(readKey("simulate", "get_project", [2]));
    expect(readKey("simulate", "get_portfolio", ["G", [1n, 2n]])).toBe(readKey("simulate", "get_portfolio", ["G", [1n, 2n]]));
  });

  it("never caches a failure", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce("ok");
    await expect(cachedRead("k", load)).rejects.toThrow("429");
    await expect(cachedRead("k", load)).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reloads after the TTL or after clearReadCache()", async () => {
    const load = vi.fn(async () => "v");
    await cachedRead("k", load);
    await cachedRead("k", load, 0); // expired
    clearReadCache();
    await cachedRead("k", load);
    expect(load).toHaveBeenCalledTimes(3);
  });
});

describe("read helpers share the cache", () => {
  it("readContractNative: identical simulations hit the RPC once, other args do not share", async () => {
    rpc.simulateTransaction.mockResolvedValue({ result: { retval: sdk.nativeToScVal(4n, { type: "u64" }) } });
    const [a, b, c] = await Promise.all([
      readContractNative("next_project_id"),
      readContractNative("next_project_id"),
      readContractNative("next_project_id"),
    ]);
    expect([a, b, c]).toEqual([4n, 4n, 4n]);
    expect(rpc.simulateTransaction).toHaveBeenCalledTimes(1);
    await Promise.all([readContractNative("get_project_name", [1]), readContractNative("get_project_name", [2])]);
    expect(rpc.simulateTransaction).toHaveBeenCalledTimes(3);
  });

  it("fetchContractEvents: the Hero feed and the holder indexer share one purchase scan", async () => {
    rpc.getHealth.mockResolvedValue({ status: "healthy", oldestLedger: 4850000, latestLedger: 4860000 });
    rpc.getEvents.mockResolvedValue({ events: [], cursor: "", latestLedger: 4860000 });
    await Promise.all([fetchContractEvents("purchase", ["*", "*"]), fetchContractEvents("purchase", ["*", "*"])]);
    expect(rpc.getHealth).toHaveBeenCalledTimes(1);
    expect(rpc.getEvents).toHaveBeenCalledTimes(1);
    await fetchContractEvents("deposit", ["*"]);
    expect(rpc.getEvents).toHaveBeenCalledTimes(2);
  });
});
