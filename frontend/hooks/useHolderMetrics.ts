"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getHolderCount,
  type HolderMetrics,
} from "@/lib/holderIndexer";

type UseHolderMetricsReturn = {
  metrics: HolderMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useHolderMetrics(pollMs = 30000): UseHolderMetricsReturn {
  const [metrics, setMetrics] = useState<HolderMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const m = await getHolderCount();
      setMetrics(m);
      // If holderCount is null we keep loading=false but caller shows indexing
      // For initial indexing state we also set loading false to allow UI to render "—"
      setLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const m = await getHolderCount();
        if (!cancelled) {
          setMetrics(m);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();

    const id = setInterval(() => {
      if (!cancelled) refresh();
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh, pollMs]);

  // Derive loading for indexing state: if holderCount is null and status is indexing,
  // consumer should show Indexing... but we keep loading false after first fetch
  // so we expose metrics.status. For backwards compat the hook returns loading only for first fetch.
  return { metrics, loading, error, refresh };
}

export default useHolderMetrics;
