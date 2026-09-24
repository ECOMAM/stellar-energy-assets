import { describe, it, expect } from "vitest";
import {
  STROOPS_PER_XLM,
  XLM_DECIMALS,
  xlmToStroops,
  stroopsToXlm,
  formatXlm,
  toBigInt,
} from "@/lib/units";

// ═══════════════════════════════════════════════════════════
// UNIT: XLM <-> stroops (1 XLM = 10^7 stroops, 7 decimals)
// ═══════════════════════════════════════════════════════════

describe("units: constants", () => {
  it("STROOPS_PER_XLM is 10_000_000n and XLM has 7 decimals", () => {
    expect(STROOPS_PER_XLM).toBe(10_000_000n);
    expect(XLM_DECIMALS).toBe(7);
  });
});

describe("xlmToStroops", () => {
  it("10 XLM = 100000000 stroops (the on-chain price of project 1)", () => {
    expect(xlmToStroops("10")).toBe(100000000n);
    expect(xlmToStroops(10)).toBe(100000000n);
    expect(xlmToStroops(10n)).toBe(100000000n);
  });

  it("handles every decimal position exactly", () => {
    expect(xlmToStroops("0.0000001")).toBe(1n);
    expect(xlmToStroops("1.2345678")).toBe(12345678n);
    expect(xlmToStroops("0.5")).toBe(5000000n);
    expect(xlmToStroops(".5")).toBe(5000000n);
    expect(xlmToStroops("5.")).toBe(50000000n);
    expect(xlmToStroops(" 40 ")).toBe(400000000n);
    expect(xlmToStroops("0")).toBe(0n);
  });

  it("is bigint-safe beyond Number precision", () => {
    // i64::MAX stroops and a u128-sized amount survive the round trip.
    expect(xlmToStroops("922337203685.4775807")).toBe(9223372036854775807n);
    const huge = "34028236692093846346337460743176.8211455";
    expect(xlmToStroops(huge)).toBe(340282366920938463463374607431768211455n);
    expect(stroopsToXlm(xlmToStroops(huge))).toBe(huge);
  });

  it("rejects more than 7 decimals instead of rounding", () => {
    expect(() => xlmToStroops("1.23456789")).toThrow(RangeError);
  });

  it("rejects negatives and malformed input", () => {
    expect(() => xlmToStroops("-1")).toThrow(RangeError);
    expect(() => xlmToStroops(-1)).toThrow(RangeError);
    expect(() => xlmToStroops(-1n)).toThrow(RangeError);
    expect(() => xlmToStroops("abc")).toThrow(RangeError);
    expect(() => xlmToStroops("")).toThrow(RangeError);
    expect(() => xlmToStroops(".")).toThrow(RangeError);
    expect(() => xlmToStroops("1e3")).toThrow(RangeError);
    expect(() => xlmToStroops("1,000")).toThrow(RangeError);
    expect(() => xlmToStroops(Number.NaN)).toThrow(RangeError);
  });
});

describe("stroopsToXlm", () => {
  it("100000000 stroops = 10 XLM", () => {
    expect(stroopsToXlm(100000000n)).toBe("10");
    expect(stroopsToXlm("100000000")).toBe("10");
    expect(stroopsToXlm(100000000)).toBe("10");
  });

  it("keeps all significant decimals and drops trailing zeros", () => {
    expect(stroopsToXlm(1n)).toBe("0.0000001");
    expect(stroopsToXlm(12345678n)).toBe("1.2345678");
    expect(stroopsToXlm(15000000n)).toBe("1.5");
    expect(stroopsToXlm(0n)).toBe("0");
    expect(stroopsToXlm(-15000000n)).toBe("-1.5");
  });

  it("round-trips with xlmToStroops", () => {
    for (const xlm of ["0", "0.0000001", "1", "10", "300", "40.25", "9600.5000001"]) {
      expect(stroopsToXlm(xlmToStroops(xlm))).toBe(xlm);
    }
  });

  it("price * amount stays exact: 3 x 10 XLM = 30 XLM", () => {
    expect(stroopsToXlm(xlmToStroops("10") * 3n)).toBe("30");
  });
});

describe("formatXlm", () => {
  it("rounds half-up to 2 decimals by default and trims zeros", () => {
    expect(formatXlm(123456789n)).toBe("12.35");
    expect(formatXlm(100000000n)).toBe("10");
    expect(formatXlm(1n)).toBe("0");
    expect(formatXlm(-15000000n)).toBe("-1.5");
  });

  it("groups thousands and honours min/max decimals", () => {
    expect(formatXlm(xlmToStroops("15000"))).toBe("15,000");
    expect(formatXlm(100000000n, { minDecimals: 2 })).toBe("10.00");
    expect(formatXlm(50000n, { maxDecimals: 7 })).toBe("0.005");
  });
});

describe("toBigInt", () => {
  it("accepts bigint, safe integers and digit strings only", () => {
    expect(toBigInt(5n)).toBe(5n);
    expect(toBigInt(5)).toBe(5n);
    expect(toBigInt("5")).toBe(5n);
    expect(() => toBigInt(1.5)).toThrow(RangeError);
    expect(() => toBigInt("1.5")).toThrow(RangeError);
  });
});
