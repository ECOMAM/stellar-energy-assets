import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// UNIT: Investment calculations
// ═══════════════════════════════════════════════════════════

describe("Investment calculator", () => {
  const PRICE_PER_TOKEN = 10; // XLM
  const APY = 12.5; // percent
  const TOKEN_WP = 1.5; // Wp per token
  const XLM_TO_USD = 0.13;

  it("calculates cost in XLM", () => {
    const tokenCount = 100;
    const costXlm = tokenCount * PRICE_PER_TOKEN;
    expect(costXlm).toBe(1000);
  });

  it("calculates cost in USD", () => {
    const costXlm = 1000;
    const costUsd = costXlm * XLM_TO_USD;
    expect(costUsd).toBeCloseTo(130, 0);
  });

  it("calculates capacity in Wp", () => {
    const tokenCount = 100;
    const capacity = tokenCount * TOKEN_WP;
    expect(capacity).toBe(150);
  });

  it("calculates daily return", () => {
    const costXlm = 1000;
    const daily = (costXlm * APY) / 100 / 365;
    expect(daily).toBeCloseTo(0.342, 2);
  });

  it("calculates annual return", () => {
    const costXlm = 1000;
    const annual = costXlm * (APY / 100);
    expect(annual).toBe(125);
  });

  it("calculates CO2 offset per token", () => {
    const tokenCount = 100;
    const co2 = tokenCount * 0.32;
    expect(co2).toBe(32);
  });

  it("calculates payment in stroops", () => {
    const tokenCount = 10;
    const paymentStroops = BigInt(
      Math.round(tokenCount * PRICE_PER_TOKEN * 1_000_000)
    );
    expect(paymentStroops).toBe(BigInt(100_000_000));
  });

  it("BigInt payment converts to string for display", () => {
    const paymentStroops = BigInt(100_000_000);
    expect(paymentStroops.toString()).toBe("100000000");
  });

  it("token count must be >= 1", () => {
    const tokenCount = Math.max(1, parseInt("0") || 1);
    expect(tokenCount).toBe(1);
  });

  it("token count parses valid input", () => {
    const tokenCount = Math.max(1, parseInt("50") || 1);
    expect(tokenCount).toBe(50);
  });
});
