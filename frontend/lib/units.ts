/**
 * XLM <-> stroops conversion. The only place in the frontend that knows the
 * scale: 1 XLM = 10^7 stroops (7 decimals). All contract amounts (price,
 * revenue, claimable, sales) are u128 stroops, so everything here is bigint.
 */

/** 10_000_000n. Written with BigInt() because tsconfig targets ES2017, where
 *  bigint literals are not allowed; the value is identical. */
export const STROOPS_PER_XLM: bigint = BigInt(10_000_000);
export const XLM_DECIMALS = 7;

const ZERO = BigInt(0);
const TEN = BigInt(10);

/** Anything the contract/SDK may hand back for an integer amount. */
export type StroopsLike = bigint | number | string;

/** Normalise an integer amount (bigint, safe integer or digit string) to bigint. */
export function toBigInt(value: StroopsLike): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`Monto no entero o fuera de rango seguro: ${value}`);
    }
    return BigInt(value);
  }
  const s = value.trim();
  if (!/^-?\d+$/.test(s)) {
    throw new RangeError(`Monto entero inválido: "${value}"`);
  }
  return BigInt(s);
}

/**
 * XLM -> stroops. Accepts a decimal string ("10", "0.5", "1.2345678"), a
 * number (converted through toFixed(7)) or a bigint of whole XLM.
 * Throws on negatives, on more than 7 decimals and on malformed input: an
 * amount that moves XLM is never rounded silently.
 */
export function xlmToStroops(xlm: string | number | bigint): bigint {
  if (typeof xlm === "bigint") {
    if (xlm < ZERO) throw new RangeError("El monto en XLM no puede ser negativo");
    return xlm * STROOPS_PER_XLM;
  }
  let s: string;
  if (typeof xlm === "number") {
    if (!Number.isFinite(xlm)) throw new RangeError(`Monto XLM inválido: ${xlm}`);
    s = xlm.toFixed(XLM_DECIMALS);
  } else {
    s = xlm.trim();
  }
  if (s.startsWith("-")) throw new RangeError("El monto en XLM no puede ser negativo");
  const m = /^(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (m[1] === "" && (m[2] ?? "") === "")) {
    throw new RangeError(`Monto XLM inválido: "${xlm}"`);
  }
  const whole = m[1] === "" ? "0" : m[1];
  const frac = m[2] ?? "";
  if (frac.length > XLM_DECIMALS) {
    throw new RangeError(`XLM admite como máximo ${XLM_DECIMALS} decimales: "${xlm}"`);
  }
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(frac.padEnd(XLM_DECIMALS, "0"));
}

/**
 * stroops -> exact XLM decimal string, without trailing zeros.
 * 100000000n -> "10", 1n -> "0.0000001", -15000000n -> "-1.5".
 */
export function stroopsToXlm(stroops: StroopsLike): string {
  const v = toBigInt(stroops);
  const neg = v < ZERO;
  const abs = neg ? -v : v;
  const whole = abs / STROOPS_PER_XLM;
  const frac = (abs % STROOPS_PER_XLM)
    .toString()
    .padStart(XLM_DECIMALS, "0")
    .replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * stroops -> display string with thousands separators, rounded half-up to
 * `maxDecimals` (default 2) and without trailing zeros unless
 * `minDecimals` asks for them. formatXlm(123456789n) === "12.35".
 */
export function formatXlm(
  stroops: StroopsLike,
  opts: { maxDecimals?: number; minDecimals?: number } = {}
): string {
  const maxDecimals = Math.min(Math.max(opts.maxDecimals ?? 2, 0), XLM_DECIMALS);
  const minDecimals = Math.min(Math.max(opts.minDecimals ?? 0, 0), maxDecimals);
  const v = toBigInt(stroops);
  const neg = v < ZERO;
  const abs = neg ? -v : v;
  const step = TEN ** BigInt(XLM_DECIMALS - maxDecimals);
  const rounded = (abs + step / BigInt(2)) / step; // units of 10^-maxDecimals XLM
  const scale = TEN ** BigInt(maxDecimals);
  const whole = rounded / scale;
  let frac = maxDecimals > 0 ? (rounded % scale).toString().padStart(maxDecimals, "0") : "";
  while (frac.length > minDecimals && frac.endsWith("0")) frac = frac.slice(0, -1);
  const isZero = rounded === ZERO;
  return `${neg && !isZero ? "-" : ""}${groupThousands(whole.toString())}${frac ? `.${frac}` : ""}`;
}

/** stroops -> JS number of XLM. Only for charts/approximate UI math, never for amounts sent on-chain. */
export function stroopsToXlmNumber(stroops: StroopsLike): number {
  return Number(stroopsToXlm(stroops));
}
