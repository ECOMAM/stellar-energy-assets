/**
 * Global BigInt serialization guard.
 *
 * The Stellar SDK internally calls JSON.stringify on objects containing BigInt
 * values (e.g. during prepareTransaction / sendTransaction). This crashes with
 * "Do not know how to serialize a BigInt". We patch JSON.stringify once at
 * module load so ALL callers — including third-party libs — handle BigInt.
 *
 * Import this module BEFORE any Stellar SDK usage (e.g. WalletContext.tsx).
 */

const _origStringify = JSON.stringify;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(JSON as any).stringify = function patchedStringify(
  value: unknown,
  replacer?: (this: unknown, key: string, value: unknown) => unknown,
  space?: string | number
): string {
  const safeReplacer = (_key: string, val: unknown) =>
    typeof val === "bigint" ? val.toString() : val;

  if (typeof replacer === "function") {
    // Caller has their own replacer — wrap it to also handle BigInt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = function (this: unknown, key: string, val: any) {
      if (typeof val === "bigint") return val.toString();
      return replacer.call(this, key, val);
    };
    return _origStringify(value, wrapped, space);
  }
  return _origStringify(value, safeReplacer, space);
};
