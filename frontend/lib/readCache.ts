/**
 * Module-level promise cache for read-only RPC calls (simulations and event
 * scans). The landing mounts several components that ask for the same data
 * (three useOnChainProjects, the holder indexer, the Hero feed): identical
 * reads made while one is in flight, or up to READ_TTL_MS after it resolved,
 * share one promise instead of hitting the public RPC again (429 risk).
 *
 * Failures are never cached. clearReadCache() drops everything: it runs after
 * every submitted transaction and before the pre-sign re-check, so a write is
 * always followed by fresh reads.
 */

export const READ_TTL_MS = 30_000;

type Entry = { promise: Promise<unknown>; settledAt: number | null };

const entries = new Map<string, Entry>();

/** Cache key for a read; bigints and nested arrays serialize deterministically. */
export function readKey(...parts: unknown[]): string {
  return JSON.stringify(parts, (_key, value) => (typeof value === "bigint" ? `${value}n` : value));
}

/** Run `load` once per `key`: concurrent and recent callers share its promise. */
export function cachedRead<T>(key: string, load: () => Promise<T>, ttlMs: number = READ_TTL_MS): Promise<T> {
  const hit = entries.get(key);
  if (hit && (hit.settledAt === null || Date.now() - hit.settledAt < ttlMs)) {
    return hit.promise as Promise<T>;
  }
  const entry: Entry = { promise: new Promise<T>((resolve) => resolve(load())), settledAt: null };
  entries.set(key, entry);
  entry.promise.then(
    () => {
      entry.settledAt = Date.now();
    },
    () => {
      if (entries.get(key) === entry) entries.delete(key);
    }
  );
  return entry.promise as Promise<T>;
}

/** Forget every cached read (after a transaction, or when fresh state is required). */
export function clearReadCache(): void {
  entries.clear();
}
