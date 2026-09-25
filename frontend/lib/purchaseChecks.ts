/**
 * Pre-checks run before purchase_tokens is signed, mirroring the contract's
 * own guards so the user sees a clear reason instead of a failed simulation:
 *   (a) is_participant(buyer)          -> NotParticipant (#4)
 *   (b) is_paused()                    -> Paused (#5)
 *   (c) minted + amount <= total_supply -> InsufficientSupply (#10)
 *   (d) spendable XLM >= price * amount + fee margin -> InsufficientBalance (#11)
 * plus project active (#7) and min_purchase (#9).
 */

import { HORIZON_URL } from "./contract";
import { PARTICIPANT_NOT_APPROVED_MESSAGE } from "./contractErrors";
import { formatXlm, xlmToStroops } from "./units";

/** Margin kept for network fees (measured purchase_tokens fee on testnet: 0.03-0.08 XLM). */
export const FEE_MARGIN_STROOPS = xlmToStroops("0.5");
/** Stellar base reserve per ledger entry (0.5 XLM). */
export const BASE_RESERVE_STROOPS = xlmToStroops("0.5");

export type PurchaseBlockerCode =
  | "invalid_amount"
  | "not_participant"
  | "paused"
  | "inactive"
  | "below_minimum"
  | "supply"
  | "balance";

export type PurchaseBlocker = { code: PurchaseBlockerCode; message: string };

export type PurchaseProjectState = {
  totalSupply: bigint;
  minted: bigint;
  minPurchase: bigint;
  price: bigint;
  active: boolean;
};

export type PurchaseCheckInput = {
  /** null while unknown (loading or RPC failure) */
  isParticipant: boolean | null;
  paused: boolean | null;
  project: PurchaseProjectState | null;
  amount: bigint;
  /** spendable native balance in stroops; null while unknown */
  spendableStroops: bigint | null;
  feeMarginStroops?: bigint;
};

export type PurchaseCheckResult = {
  ok: boolean;
  /** true while any input needed for a verdict is still unknown */
  pending: boolean;
  blockers: PurchaseBlocker[];
  totalPriceStroops: bigint | null;
  requiredStroops: bigint | null;
  remainingSupply: bigint | null;
};

/** Digits only, at most 18: always a safe BigInt, far below the u128 limit. */
export const PARTICIPATION_COUNT_PATTERN = /^\d{1,18}$/;

export const INVALID_COUNT_MESSAGE =
  "Ingresa la cantidad de participaciones como un número entero (solo dígitos, hasta 18).";

/** The typed participation count, or null when it is not 1-18 digits (checked before BigInt). */
export function parseParticipationCount(input: string): bigint | null {
  const s = input.trim();
  return PARTICIPATION_COUNT_PATTERN.test(s) ? BigInt(s) : null;
}

export function remainingSupply(p: Pick<PurchaseProjectState, "totalSupply" | "minted">): bigint {
  const r = p.totalSupply - p.minted;
  return r > BigInt(0) ? r : BigInt(0);
}

/** (c): the contract accepts the purchase only if minted + amount <= total_supply. */
export function supplyAllows(p: Pick<PurchaseProjectState, "totalSupply" | "minted">, amount: bigint): boolean {
  return p.minted + amount <= p.totalSupply;
}

export function checkPurchase(input: PurchaseCheckInput): PurchaseCheckResult {
  const margin = input.feeMarginStroops ?? FEE_MARGIN_STROOPS;
  const blockers: PurchaseBlocker[] = [];
  const { project, amount } = input;

  if (amount <= BigInt(0)) {
    blockers.push({ code: "invalid_amount", message: "La cantidad debe ser al menos 1 participación." });
  }
  if (input.isParticipant === false) {
    blockers.push({ code: "not_participant", message: PARTICIPANT_NOT_APPROVED_MESSAGE });
  }
  if (input.paused === true) {
    blockers.push({
      code: "paused",
      message: "El contrato está en pausa: el administrador bloqueó temporalmente las compras.",
    });
  }

  let totalPrice: bigint | null = null;
  let required: bigint | null = null;
  let remaining: bigint | null = null;

  if (project) {
    remaining = remainingSupply(project);
    totalPrice = project.price * amount;
    required = totalPrice + margin;
    if (!project.active) {
      blockers.push({ code: "inactive", message: "El proyecto está inactivo y no acepta compras." });
    }
    if (amount > BigInt(0) && amount < project.minPurchase) {
      blockers.push({
        code: "below_minimum",
        message: `La compra mínima de este proyecto es ${project.minPurchase.toString()} participaciones.`,
      });
    }
    if (!supplyAllows(project, amount)) {
      blockers.push({
        code: "supply",
        message:
          remaining === BigInt(0)
            ? "El proyecto ya no tiene supply disponible."
            : `Solo quedan ${remaining.toString()} participaciones disponibles en este proyecto.`,
      });
    }
    if (input.spendableStroops !== null && input.spendableStroops < required) {
      blockers.push({
        code: "balance",
        message: `Tu saldo disponible (${formatXlm(input.spendableStroops)} XLM) no cubre ${formatXlm(
          totalPrice
        )} XLM de la compra más ${formatXlm(margin)} XLM de margen para comisiones.`,
      });
    }
  }

  const pending =
    input.isParticipant === null || input.paused === null || project === null || input.spendableStroops === null;
  return {
    ok: !pending && blockers.length === 0,
    pending,
    blockers,
    totalPriceStroops: totalPrice,
    requiredStroops: required,
    remainingSupply: remaining,
  };
}

type HorizonNativeBalance = { asset_type: string; balance: string; selling_liabilities?: string };
type HorizonAccount = {
  balances?: HorizonNativeBalance[];
  subentry_count?: number;
  num_sponsoring?: number;
  num_sponsored?: number;
};

/**
 * Spendable native XLM in stroops = balance - minimum reserve - selling
 * liabilities, from the Horizon account record (exact, no float parsing).
 */
export function spendableFromHorizon(account: HorizonAccount): bigint {
  const native = account.balances?.find((b) => b.asset_type === "native");
  if (!native) return BigInt(0);
  const balance = xlmToStroops(native.balance);
  const selling = xlmToStroops(native.selling_liabilities ?? "0");
  const entries = 2 + (account.subentry_count ?? 0) + (account.num_sponsoring ?? 0) - (account.num_sponsored ?? 0);
  const spendable = balance - BigInt(Math.max(entries, 0)) * BASE_RESERVE_STROOPS - selling;
  return spendable > BigInt(0) ? spendable : BigInt(0);
}

export async function fetchSpendableStroops(address: string): Promise<bigint> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (res.status === 404) return BigInt(0); // account not funded on testnet
  if (!res.ok) throw new Error(`Horizon ${res.status}`);
  return spendableFromHorizon((await res.json()) as HorizonAccount);
}
