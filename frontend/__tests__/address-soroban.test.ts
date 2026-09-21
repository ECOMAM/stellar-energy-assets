import { describe, it, expect } from "vitest";
import { Address, xdr, nativeToScVal } from "@stellar/stellar-sdk";

// ═══════════════════════════════════════════════════════════
// UNIT: Address to ScVal conversion (the XDR fix)
// ═══════════════════════════════════════════════════════════

describe("Stellar Address to ScVal conversion", () => {
  const TEST_ADDR = "GABGH363YQNYYAUN2M6YAPYFLPDMU5GZIJDWOEC2G3AUEH3TLPSXN3TX";
  const TEST_CONTRACT =
    "CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3";

  it("Address.fromString().toScVal() produces valid XDR", () => {
    const addr = Address.fromString(TEST_ADDR);
    const scVal = addr.toScVal();
    expect(scVal).toBeDefined();
    const xdrBytes = scVal.toXDR();
    // SDK v17 returns Uint8Array, not Buffer
    expect(xdrBytes).toBeInstanceOf(Uint8Array);
    expect(xdrBytes.length).toBeGreaterThan(0);
  });

  it("Address.toScVal() round-trips through XDR", () => {
    const addr = Address.fromString(TEST_ADDR);
    const scVal = addr.toScVal();
    const xdrBuf = scVal.toXDR();
    const decoded = xdr.ScVal.fromXDR(xdrBuf);
    const back = Address.fromScVal(decoded);
    expect(back.toString()).toBe(TEST_ADDR);
  });

  it("Regex identifies Stellar G-accounts and C-contracts", () => {
    const regex = /^[GC][A-Z0-9]{55}$/;
    expect(regex.test(TEST_ADDR)).toBe(true);
    expect(regex.test(TEST_CONTRACT)).toBe(true);
    expect(regex.test("CCTESTINVALID")).toBe(false);
    expect(regex.test("not-an-address")).toBe(false);
    expect(regex.test("")).toBe(false);
  });

  it("non-address strings pass through unchanged in arg mapper", () => {
    const regex = /^[GC][A-Z0-9]{55}$/;
    const val = "not-a-stellar-address";
    expect(regex.test(val)).toBe(false);
    // Simulates the mapper: non-address values stay as-is
    const result = regex.test(val) ? Address.fromString(val).toScVal() : val;
    expect(result).toBe(val);
  });

  it("BigInt values pass through unchanged in arg mapper", () => {
    const regex = /^[GC][A-Z0-9]{55}$/;
    const val = BigInt(42);
    expect(typeof val).toBe("bigint");
    expect(regex.test(val as unknown as string)).toBe(false);
  });

  it("encodes project IDs as u64 instead of u128", () => {
    const encoded = nativeToScVal(BigInt(1), { type: "u64" });
    expect(encoded).toBeDefined();
    const xdrBytes = encoded.toXDR();
    // SDK v17 returns Uint8Array, not Buffer
    expect(xdrBytes).toBeInstanceOf(Uint8Array);
  });
});
