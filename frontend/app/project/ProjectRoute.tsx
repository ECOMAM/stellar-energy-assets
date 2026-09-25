"use client";

import { useSearchParams } from "next/navigation";
import { parseProjectId } from "@/lib/projects";
import ProjectDetailClient from "./ProjectDetailClient";
import { ProjectNotFound } from "./ProjectStates";

/**
 * Reads `?id=` and picks the view. A missing or malformed id is "not found"
 * right away, with no RPC call and no fallback to another project.
 */
export default function ProjectRoute() {
  const raw = useSearchParams().get("id");
  const id = parseProjectId(raw);
  if (id === null) return <ProjectNotFound reason={raw === null ? "missing" : "invalid"} rawId={raw} />;
  // key: a new id (client-side navigation) starts from a clean state.
  return <ProjectDetailClient key={id} id={id} />;
}
