import { describe, it, expect } from "vitest";
import * as sdk from "@stellar/stellar-sdk";
import { CONTRACT_SIGNATURES, encodeContractArgs } from "@/lib/soroban";
import {
  CONTRACT_ERRORS,
  PARTICIPANT_NOT_APPROVED_MESSAGE,
  XLM_BALANCE_TOO_LOW_MESSAGE,
  describeContractError,
  describeTxError,
  parseContractErrorCode,
} from "@/lib/contractErrors";
import { CONTRACT_ID } from "@/lib/contract";
import { xlmToStroops } from "@/lib/units";

const BUYER = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";

// ═══════════════════════════════════════════════════════════
// UNIT: v2 argument encoding by signature
// ═══════════════════════════════════════════════════════════

// SDK v17 ScVals are tagged objects: { type: "scvU64", u64: ... }.
const tag = (v: unknown) => (v as { type: string }).type;

describe("encodeContractArgs (v2 signatures)", () => {
  const kinds = (method: string, args: unknown[]) => encodeContractArgs(sdk, method, args).map(tag);

  it("uses the v2 contract id as fallback", () => {
    expect(CONTRACT_ID).toBe("CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM");
  });

  it("has no initialize (the v2 contract uses a constructor)", () => {
    expect(Object.keys(CONTRACT_SIGNATURES)).not.toContain("initialize");
    expect(() => encodeContractArgs(sdk, "initialize", [])).toThrow(/no es una función/);
  });

  it("get_project(project_id) encodes the id as u64 (index 0)", () => {
    expect(kinds("get_project", [1])).toEqual(["scvU64"]);
    expect(kinds("get_project_name", [2])).toEqual(["scvU64"]);
  });

  it("purchase_tokens(buyer: Address, project_id: u64, amount: u128)", () => {
    expect(kinds("purchase_tokens", [BUYER, 1, 3n])).toEqual(["scvAddress", "scvU64", "scvU128"]);
  });

  it("claim_revenue(investor: Address, project_id: u64) keeps the real project id", () => {
    const [addr, pid] = encodeContractArgs(sdk, "claim_revenue", [BUYER, 3]);
    expect(sdk.scValToNative(addr)).toBe(BUYER);
    expect(sdk.scValToNative(pid)).toBe(3n);
  });

  it("create_project(creator, name: String, supply, price, min_purchase: u128)", () => {
    const vals = encodeContractArgs(sdk, "create_project", [BUYER, BUYER, 1000, xlmToStroops("10"), 1]);
    // A name that looks like an address stays a String: encoding follows the signature.
    expect(vals.map(tag)).toEqual(["scvAddress", "scvString", "scvU128", "scvU128", "scvU128"]);
    expect(sdk.scValToNative(vals[3])).toBe(100000000n);
  });

  it("deposit_revenue(depositor, project_id: u64, amount: u128, energy_kwh_delta: u128)", () => {
    expect(kinds("deposit_revenue", [BUYER, 1, xlmToStroops("40"), 1250])).toEqual([
      "scvAddress",
      "scvU64",
      "scvU128",
      "scvU128",
    ]);
  });

  it("withdraw_sales and get_portfolio(Vec<u64>)", () => {
    expect(kinds("withdraw_sales", [BUYER, 1, xlmToStroops("5")])).toEqual(["scvAddress", "scvU64", "scvU128"]);
    const [, vec] = encodeContractArgs(sdk, "get_portfolio", [BUYER, [1, 2, 3]]);
    expect(tag(vec)).toBe("scvVec");
    expect((vec as unknown as { vec: unknown[] }).vec.map(tag)).toEqual(["scvU64", "scvU64", "scvU64"]);
    expect(sdk.scValToNative(vec)).toEqual([1n, 2n, 3n]);
  });

  it("rejects wrong arity, negative amounts and bad addresses", () => {
    expect(() => encodeContractArgs(sdk, "purchase_tokens", [BUYER, 1])).toThrow(/espera 3/);
    expect(() => encodeContractArgs(sdk, "purchase_tokens", [BUYER, 1, -1])).toThrow();
    expect(() => encodeContractArgs(sdk, "purchase_tokens", [BUYER, 1, 1.5])).toThrow();
    expect(() => encodeContractArgs(sdk, "is_participant", ["not-an-address"])).toThrow();
    expect(() => encodeContractArgs(sdk, "get_project", [2n ** 64n])).toThrow(RangeError);
  });
});

// ═══════════════════════════════════════════════════════════
// UNIT: contract error codes -> Spanish messages
// ═══════════════════════════════════════════════════════════

describe("contract error map", () => {
  it("covers codes 1..14 with the names of the Rust enum", () => {
    expect(Object.keys(CONTRACT_ERRORS).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(CONTRACT_ERRORS[1].name).toBe("NotAdmin");
    expect(CONTRACT_ERRORS[4].name).toBe("NotParticipant");
    expect(CONTRACT_ERRORS[10].name).toBe("InsufficientSupply");
    expect(CONTRACT_ERRORS[14].name).toBe("RewardTooSmall");
  });

  it("parses Error(Contract, #N) from simulation text and Error objects", () => {
    const sim =
      "Simulation failed: HostError: Error(Contract, #4)\n\nEvent log (newest first):\n   0: [Diagnostic Event] contract:CADA..., topics:[error, Error(Contract, #4)]";
    expect(parseContractErrorCode(sim)).toBe(4);
    expect(parseContractErrorCode(new Error("HostError: Error(Contract, #14)"))).toBe(14);
    expect(parseContractErrorCode("Transaction failed: tx_bad_seq")).toBeNull();
  });

  it("NotParticipant tells the user about the simulated KYC", () => {
    expect(describeTxError("HostError: Error(Contract, #4)")).toContain(PARTICIPANT_NOT_APPROVED_MESSAGE);
    expect(PARTICIPANT_NOT_APPROVED_MESSAGE).toContain("KYC simulado para esta demo");
  });

  it("disambiguates #10: sold out vs. the XLM SAC balance error", () => {
    expect(describeContractError(10, { method: "purchase_tokens", supplyAvailable: false })).toBe(
      CONTRACT_ERRORS[10].message
    );
    expect(describeContractError(10, { method: "purchase_tokens", supplyAvailable: true })).toBe(
      XLM_BALANCE_TOO_LOW_MESSAGE
    );
    expect(describeContractError(10, { method: "purchase_tokens" })).toMatch(/supply.*saldo/);
    expect(describeContractError(10, { method: "deposit_revenue" })).toBe(XLM_BALANCE_TOO_LOW_MESSAGE);
  });

  it("maps wallet failures to Spanish messages", () => {
    expect(describeTxError(new Error("User declined access"))).toMatch(/Cancelaste/);
    expect(describeTxError(new Error("Wallet not connected"))).toMatch(/Conecta/);
    expect(describeTxError("HostError: Error(Contract, #5)")).toMatch(/pausa/);
  });
});
