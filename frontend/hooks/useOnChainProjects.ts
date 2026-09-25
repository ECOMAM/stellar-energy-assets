"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOnChainProjects, type OnChainProject, type OnChainProjectList } from "@/lib/projects";

type UseOnChainProjectsReturn = {
  /** null while loading or when the RPC is unreachable (UI shows labelled DEMO fallback) */
  projects: OnChainProject[] | null;
  /** next_project_id read with the list; null while loading or unreachable */
  nextProjectId: number | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** Every project 1..next_project_id-1 read from the contract (get_project + get_project_name). */
export function useOnChainProjects(): UseOnChainProjectsReturn {
  const [list, setList] = useState<OnChainProjectList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setList(await fetchOnChainProjects());
      setError(null);
    } catch (e) {
      console.warn("on-chain projects fetch failed", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { projects: list?.projects ?? null, nextProjectId: list?.nextProjectId ?? null, loading, error, reload };
}

export default useOnChainProjects;
