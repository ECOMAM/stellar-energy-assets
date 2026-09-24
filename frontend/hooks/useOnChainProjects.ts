"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOnChainProjects, type OnChainProject } from "@/lib/projects";

type UseOnChainProjectsReturn = {
  /** null while loading or when the RPC is unreachable (UI shows labelled DEMO fallback) */
  projects: OnChainProject[] | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** Projects 1..next_project_id-1 read from the v2 contract (get_project + get_project_name). */
export function useOnChainProjects(maxCount = 12): UseOnChainProjectsReturn {
  const [projects, setProjects] = useState<OnChainProject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await fetchOnChainProjects(maxCount);
      setProjects(list);
      setError(null);
    } catch (e) {
      console.warn("on-chain projects fetch failed", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [maxCount]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { projects, loading, error, reload };
}

export default useOnChainProjects;
