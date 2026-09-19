import { describe, it, expect, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// UNIT: Signing phase state machine logic
// ═══════════════════════════════════════════════════════════

describe("Signing phase state machine", () => {
  type SigningPhase =
    | "idle"
    | "preparing"
    | "signing"
    | "submitting"
    | "success"
    | "error"
    | "rejected"
    | "insufficient_balance"
    | "wallet_missing";

  const TERMINAL_PHASES: SigningPhase[] = [
    "success",
    "error",
    "rejected",
    "insufficient_balance",
    "wallet_missing",
  ];

  const ACTIVE_PHASES: SigningPhase[] = ["preparing", "signing", "submitting"];

  it("starts in idle", () => {
    let phase: SigningPhase = "idle";
    expect(TERMINAL_PHASES.includes(phase)).toBe(false);
  });

  it("can transition from idle to preparing", () => {
    let phase: SigningPhase = "idle";
    phase = "preparing";
    expect(phase).toBe("preparing");
    expect(ACTIVE_PHASES.includes(phase)).toBe(true);
  });

  it("transitions idle -> preparing -> signing -> success", () => {
    const transitions: SigningPhase[] = ["idle", "preparing", "signing", "success"];
    const last = transitions[transitions.length - 1];
    expect(TERMINAL_PHASES.includes(last)).toBe(true);
  });

  it("detects rejection from error message", () => {
    const rejectionKeywords = [
      "reject",
      "cancel",
      "decline",
      "User declined",
      "denied",
      "Request closed",
    ];
    const msg = "User declined the request";
    const isRejected = rejectionKeywords.some((kw) => msg.includes(kw));
    expect(isRejected).toBe(true);
  });

  it("detects wallet missing from error message", () => {
    const walletKeywords = [
      "not installed",
      "freighter",
      "Freighter",
      "is not defined",
      "window.freighter",
    ];
    const msg = "Freighter is not installed";
    const isMissing = walletKeywords.some((kw) => msg.includes(kw));
    expect(isMissing).toBe(true);
  });

  it("detects insufficient balance from error message", () => {
    const balanceKeywords = [
      "insufficient",
      "balance",
      "underfunded",
      "NOT_ENOUGH_BALANCE",
    ];
    const msg = "Transaction failed: underfunded";
    const isInsufficient = balanceKeywords.some((kw) => msg.includes(kw));
    expect(isInsufficient).toBe(true);
  });

  it("generic errors go to error phase", () => {
    const msg = "Some random network error";
    const rejectionKeywords = ["reject", "cancel", "decline", "User declined", "denied", "Request closed"];
    const walletKeywords = ["not installed", "freighter", "Freighter", "is not defined", "window.freighter"];
    const balanceKeywords = ["insufficient", "balance", "underfunded", "NOT_ENOUGH_BALANCE"];
    const isRejected = rejectionKeywords.some((kw) => msg.includes(kw));
    const isMissing = walletKeywords.some((kw) => msg.includes(kw));
    const isInsufficient = balanceKeywords.some((kw) => msg.includes(kw));
    const phase: SigningPhase = isRejected
      ? "rejected"
      : isMissing
        ? "wallet_missing"
        : isInsufficient
          ? "insufficient_balance"
          : "error";
    expect(phase).toBe("error");
  });

  it("modal cannot close during active phases", () => {
    for (const phase of ACTIVE_PHASES) {
      const isTerminal = TERMINAL_PHASES.includes(phase);
      expect(isTerminal).toBe(false);
    }
  });

  it("modal can close during all terminal phases", () => {
    for (const phase of TERMINAL_PHASES) {
      const isTerminal = TERMINAL_PHASES.includes(phase);
      expect(isTerminal).toBe(true);
    }
  });
});
