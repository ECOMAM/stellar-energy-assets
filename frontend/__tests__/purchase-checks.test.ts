import { describe, it, expect } from "vitest";
import {
  FEE_MARGIN_STROOPS,
  INVALID_COUNT_MESSAGE,
  checkPurchase,
  parseParticipationCount,
  spendableFromHorizon,
  supplyAllows,
  type PurchaseCheckInput,
} from "@/lib/purchaseChecks";
import { formatXlm } from "@/lib/units";
import { PARTICIPANT_NOT_APPROVED_MESSAGE } from "@/lib/contractErrors";
import { xlmToStroops } from "@/lib/units";

// Project 1 on testnet: supply 1000, 40 minted, 10 XLM, min purchase 1.
const PROJECT_1 = {
  totalSupply: 1000n,
  minted: 40n,
  minPurchase: 1n,
  price: xlmToStroops("10"),
  active: true,
};

const base = (over: Partial<PurchaseCheckInput> = {}): PurchaseCheckInput => ({
  isParticipant: true,
  paused: false,
  project: PROJECT_1,
  amount: 2n,
  spendableStroops: xlmToStroops("100"),
  ...over,
});

describe("purchase pre-checks", () => {
  it("passes for an approved participant with funds and supply", () => {
    const r = checkPurchase(base());
    expect(r.ok).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(r.totalPriceStroops).toBe(200000000n);
    expect(r.requiredStroops).toBe(200000000n + FEE_MARGIN_STROOPS);
  });

  it("(a) blocks a non-participant with the simulated-KYC message", () => {
    const r = checkPurchase(base({ isParticipant: false }));
    expect(r.ok).toBe(false);
    expect(r.blockers[0]).toEqual({ code: "not_participant", message: PARTICIPANT_NOT_APPROVED_MESSAGE });
  });

  it("(b) blocks while the contract is paused", () => {
    expect(checkPurchase(base({ paused: true })).blockers.map((b) => b.code)).toEqual(["paused"]);
  });

  it("(c) minted + amount must stay <= total_supply", () => {
    expect(supplyAllows(PROJECT_1, 960n)).toBe(true);
    expect(supplyAllows(PROJECT_1, 961n)).toBe(false);
    const r = checkPurchase(base({ amount: 961n, spendableStroops: xlmToStroops("100000") }));
    expect(r.blockers.map((b) => b.code)).toEqual(["supply"]);
    expect(r.remainingSupply).toBe(960n);
  });

  it("(d) spendable XLM must cover price * amount plus the fee margin", () => {
    // 2 x 10 XLM + 0.5 XLM margin = 20.5 XLM
    expect(checkPurchase(base({ spendableStroops: xlmToStroops("20.5") })).ok).toBe(true);
    const r = checkPurchase(base({ spendableStroops: xlmToStroops("20.4999999") }));
    expect(r.blockers.map((b) => b.code)).toEqual(["balance"]);
    expect(r.blockers[0].message).toMatch(/20\.5|0\.5/);
  });

  it("checks min_purchase and project status", () => {
    const r = checkPurchase(base({ amount: 5n, project: { ...PROJECT_1, minPurchase: 10n, active: false } }));
    expect(r.blockers.map((b) => b.code).sort()).toEqual(["below_minimum", "inactive"]);
  });

  it("stays pending (not ok) while any input is unknown", () => {
    const r = checkPurchase(base({ isParticipant: null }));
    expect(r.pending).toBe(true);
    expect(r.ok).toBe(false);
  });
});

describe("spendableFromHorizon", () => {
  it("subtracts the minimum reserve and selling liabilities exactly", () => {
    // 100 XLM, no subentries: reserve 2 x 0.5 XLM = 1 XLM -> 99 XLM spendable.
    expect(
      spendableFromHorizon({ balances: [{ asset_type: "native", balance: "100.0000000" }], subentry_count: 0 })
    ).toBe(xlmToStroops("99"));
    // 2 subentries (+1 XLM) and 3 XLM of selling liabilities.
    expect(
      spendableFromHorizon({
        balances: [{ asset_type: "native", balance: "100.0000000", selling_liabilities: "3.0000000" }],
        subentry_count: 2,
      })
    ).toBe(xlmToStroops("95"));
  });

  it("never goes negative and handles a missing native balance", () => {
    expect(spendableFromHorizon({ balances: [{ asset_type: "native", balance: "0.5000000" }] })).toBe(0n);
    expect(spendableFromHorizon({ balances: [] })).toBe(0n);
  });
});

describe("participation count input (validated before any BigInt)", () => {
  it("accepts 1 to 18 digits", () => {
    expect(parseParticipationCount("1")).toBe(1n);
    expect(parseParticipationCount(" 25 ")).toBe(25n);
    expect(parseParticipationCount("007")).toBe(7n);
    expect(parseParticipationCount("9".repeat(18))).toBe(10n ** 18n - 1n);
  });

  it("rejects everything else without throwing", () => {
    const bad = ["", " ", "abc", "1.5", "-3", "+3", "1e3", "1,000", "0x10", "Infinity", "NaN", "9".repeat(19), "9".repeat(400)];
    for (const input of bad) {
      expect(() => parseParticipationCount(input)).not.toThrow();
      expect(parseParticipationCount(input)).toBeNull();
    }
    expect(INVALID_COUNT_MESSAGE).toMatch(/número entero/);
  });

  it("the largest accepted count still renders and is checked, never crashes", () => {
    const amount = parseParticipationCount("9".repeat(18))!;
    expect(formatXlm(PROJECT_1.price * amount)).toBe("9,999,999,999,999,999,990");
    expect(checkPurchase(base({ amount })).blockers.map((b) => b.code)).toEqual(["supply", "balance"]);
  });

  it("0 parses as digits, then the purchase check blocks it", () => {
    const amount = parseParticipationCount("0")!;
    expect(amount).toBe(0n);
    expect(checkPurchase(base({ amount })).blockers.map((b) => b.code)).toContain("invalid_amount");
  });
});
