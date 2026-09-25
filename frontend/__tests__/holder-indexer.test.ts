import { describe, it, expect } from "vitest";
import * as sdk from "@stellar/stellar-sdk";
import { aggregatePurchases, parsePurchaseEvent, type PurchaseEvent } from "@/lib/holderIndexer";
import { computeStartLedger, ledgerFromCursor, parseDepositEvent } from "@/lib/events";

const P1 = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";
const P2 = "GAP552XX3ZGQ7EXSICT7PHVXTK43ZPNVJ6LJZ7HFSZYGNEHEUBM3ST46";

const sym = (s: string) => sdk.nativeToScVal(s, { type: "symbol" });
const u64 = (n: bigint) => sdk.nativeToScVal(n, { type: "u64" });
const u128 = (n: bigint) => sdk.nativeToScVal(n, { type: "u128" });
const map = (entries: [string, sdk.xdr.ScVal][]) =>
  sdk.xdr.ScVal.scvMap(entries.map(([k, v]) => new sdk.xdr.ScMapEntry({ key: sym(k), val: v })));

/** Decode like lib/events.ts does (scValToNative on every topic and on the data). */
const decode = (topics: sdk.xdr.ScVal[], value: sdk.xdr.ScVal) => ({
  topics: topics.map((t) => sdk.scValToNative(t)),
  data: sdk.scValToNative(value),
});

// Wire format asserted in lib.rs test_events_purchase_deposit_claim_kyc:
// topics ["purchase", project_id, buyer], data {amount, total_price}.
describe("v2 purchase event parsing", () => {
  it("parses topics [purchase, project_id: u64, buyer: Address] and data {amount, total_price}", () => {
    const evt = decode(
      [sym("purchase"), u64(1n), sdk.Address.fromString(P1).toScVal()],
      map([
        ["amount", u128(30n)],
        ["total_price", u128(3000000000n)],
      ])
    );
    expect(parsePurchaseEvent({ ...evt, txHash: "d4fffe34", ledger: 4852378 })).toEqual({
      projectId: 1n,
      buyer: P1,
      amount: 30n,
      totalPrice: 3000000000n,
      txHash: "d4fffe34",
      ledger: 4852378,
    });
  });

  it("ignores other events and malformed payloads", () => {
    const claim = decode(
      [sym("claim"), u64(1n), sdk.Address.fromString(P1).toScVal()],
      map([["amount", u128(300000000n)]])
    );
    expect(parsePurchaseEvent(claim)).toBeNull();
    expect(parsePurchaseEvent({ topics: ["purchase", 1n], data: { amount: 1n, total_price: 1n } })).toBeNull();
    expect(parsePurchaseEvent({ topics: ["purchase", 1n, "not-an-address"], data: { amount: 1n, total_price: 1n } })).toBeNull();
    expect(parsePurchaseEvent({ topics: ["purchase", 1n, P1], data: { amount: 1n } })).toBeNull();
  });

  it("aggregates participations per buyer across projects", () => {
    const events: PurchaseEvent[] = [
      { projectId: 1n, buyer: P1, amount: 30n, totalPrice: 0n },
      { projectId: 1n, buyer: P2, amount: 10n, totalPrice: 0n },
      { projectId: 2n, buyer: P1, amount: 45n, totalPrice: 0n },
    ];
    const agg = aggregatePurchases(events);
    expect(agg.size).toBe(2);
    expect(agg.get(P1)).toBe(75n);
    expect(agg.get(P2)).toBe(10n);
  });
});

describe("v2 deposit event parsing", () => {
  it("parses topics [deposit, project_id] and data {amount, energy_delta}", () => {
    const evt = decode([sym("deposit"), u64(1n)], map([["amount", u128(400000000n)], ["energy_delta", u128(0n)]]));
    expect(parseDepositEvent({ ...evt, txHash: "f85d09eb", ledger: 4852415, ledgerClosedAt: "2026-09-24T21:34:22Z" })).toEqual({
      projectId: 1n,
      amount: 400000000n,
      energyDelta: 0n,
      txHash: "f85d09eb",
      ledger: 4852415,
      ledgerClosedAt: "2026-09-24T21:34:22Z",
    });
  });
});

describe("getEvents ledger window", () => {
  const health = { oldestLedger: 4731771, latestLedger: 4852730 };

  it("never starts before getHealth().oldestLedger", () => {
    expect(computeStartLedger(health, null)).toBeGreaterThanOrEqual(health.oldestLedger);
    // A deploy ledger older than the retention window is ignored.
    expect(computeStartLedger(health, 100)).toBeGreaterThanOrEqual(health.oldestLedger);
    // The old latest-150000 strategy would have been out of range:
    expect(health.latestLedger - 150_000).toBeLessThan(health.oldestLedger);
  });

  it("starts at the deploy ledger when it is inside the window, never past latest", () => {
    expect(computeStartLedger(health, 4852336)).toBe(4852336);
    expect(computeStartLedger({ oldestLedger: 10, latestLedger: 12 }, null)).toBe(12);
  });

  it("reads the ledger out of a getEvents cursor", () => {
    expect(ledgerFromCursor("0020842385365794815-4294967295")).toBe(4852745);
    expect(ledgerFromCursor("")).toBeNull();
  });
});
