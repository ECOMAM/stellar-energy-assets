"use client";

import type { ReactNode } from "react";

/** Full-page states of /project/ that have no project data to show. */

const MAX_SHOWN_ID = 32;

const PRIMARY_LINK =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700";
const SECONDARY_LINK =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

function StateShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-50 font-body text-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-10">
          <a
            href="/"
            className="flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver al Directorio
          </a>
          <span className="font-mono text-[11px] text-slate-400">Stellar Testnet</span>
        </div>
      </header>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 pt-14 pb-20 text-center">
        {children}
      </main>
    </div>
  );
}

function ProjectListLinks() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <a href="/#projects" className={PRIMARY_LINK}>
        <span className="material-symbols-outlined text-[16px]">grid_view</span>
        Ver todos los proyectos
      </a>
      <a href="/dashboard" className={SECONDARY_LINK}>
        Ir al dashboard
      </a>
    </div>
  );
}

export type NotFoundReason = "missing" | "invalid" | "not_on_chain";

/** "Proyecto no encontrado": no or malformed `?id=`, or an id the contract does not have. */
export function ProjectNotFound({ reason, rawId, id }: { reason: NotFoundReason; rawId?: string | null; id?: number }) {
  const shown = (rawId ?? "").length > MAX_SHOWN_ID ? `${(rawId ?? "").slice(0, MAX_SHOWN_ID)}…` : rawId ?? "";
  const detail =
    reason === "missing"
      ? "El enlace no indica qué proyecto mostrar."
      : reason === "invalid"
        ? `"${shown}" no es un identificador de proyecto válido: debe ser un número entero mayor que cero.`
        : `El contrato de NIKO SUN en Stellar testnet no tiene un proyecto #${id}.`;
  return (
    <StateShell>
      <span className="material-symbols-outlined mb-3 text-[44px] text-slate-400" aria-hidden="true">
        search_off
      </span>
      <h1 className="font-display text-[28px] font-bold leading-tight text-slate-900">Proyecto no encontrado</h1>
      <p className="mt-3 break-words text-[14px] leading-relaxed text-slate-600">{detail}</p>
      <ProjectListLinks />
    </StateShell>
  );
}

/** First on-chain read in flight (also the static HTML of /project/ before the id is known). */
export function ProjectLoading({ id }: { id?: number }) {
  return (
    <StateShell>
      <div role="status" aria-live="polite" className="flex flex-col items-center">
        <span className="material-symbols-outlined mb-3 animate-spin text-[36px] text-emerald-600" aria-hidden="true">
          autorenew
        </span>
        <h1 className="font-display text-[22px] font-bold text-slate-900">{id ? `Proyecto #${id}` : "Proyecto"}</h1>
        <p className="mt-2 text-[13px] text-slate-500">Cargando datos on-chain…</p>
      </div>
    </StateShell>
  );
}

/**
 * The RPC could not be read and the project has no descriptive sheet, so
 * there are no DEMO values to fall back on. Not the same as "not found":
 * nothing proved that the project does not exist.
 */
export function ProjectUnreachable({ id, error, onRetry }: { id: number; error: string | null; onRetry: () => void }) {
  return (
    <StateShell>
      <span className="material-symbols-outlined mb-3 text-[44px] text-amber-500" aria-hidden="true">
        cloud_off
      </span>
      <h1 className="font-display text-[26px] font-bold leading-tight text-slate-900">
        No se pudo leer el proyecto #{id}
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
        Sin conexión con Stellar testnet: no podemos confirmar si el proyecto existe ni mostrar sus datos. Este proyecto no
        tiene ficha descriptiva, así que no hay valores DEMO que mostrar.
      </p>
      {error && <p className="mt-2 break-words text-[12px] text-amber-700">{error}</p>}
      <button type="button" onClick={onRetry} className={`${SECONDARY_LINK} mt-5`}>
        <span className="material-symbols-outlined text-[16px]">refresh</span>
        Reintentar
      </button>
      <ProjectListLinks />
    </StateShell>
  );
}
