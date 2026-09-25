"use client";

import { useState } from "react";
import { getProjectMeta, META_PROJECT_IDS, PROJECT_META, projectDisplayName } from "@/lib/projectMeta";
import { FEATURED_LIMIT, projectHref, soldPercent, visibleProjects, type OnChainProject } from "@/lib/projects";
import { formatXlm } from "@/lib/units";
import { useOnChainProjects } from "@/hooks/useOnChainProjects";
import ProjectImagePlaceholder from "@/components/ProjectImagePlaceholder";

type CardProject = {
  id: number;
  name: string;
  /** "" without a descriptive sheet */
  location: string;
  flag: string;
  asset: string;
  description: string;
  capacity: string;
  /** null: neutral placeholder (no sheet) */
  image: string | null;
  /** false: generic presentation, only on-chain facts */
  hasSheet: boolean;
  /** stroops per participation */
  price: bigint;
  minted: bigint;
  totalSupply: bigint;
  percent: number;
  /** false = fallback values (chain unreachable), labelled DEMO */
  isReal: boolean;
};

/** Labelled DEMO fallback, keyed by the same ids as the on-chain projects. */
function fallbackProjects(): CardProject[] {
  return META_PROJECT_IDS.map((id) => {
    const sheet = PROJECT_META[id];
    const f = sheet.fallback;
    return {
      id,
      name: f.name,
      location: sheet.location,
      flag: sheet.flag,
      asset: sheet.asset,
      description: sheet.description,
      capacity: sheet.capacity,
      image: sheet.image,
      hasSheet: true,
      price: f.price,
      minted: f.minted,
      totalSupply: f.totalSupply,
      percent: soldPercent(f),
      isReal: false,
    };
  });
}

/** On-chain numbers + the sheet, or the generic presentation for a project without one. */
function fromChain(p: OnChainProject): CardProject {
  const meta = getProjectMeta(p.id);
  return {
    id: p.id,
    name: projectDisplayName(p.id, p.name),
    location: meta.location,
    flag: meta.flag,
    asset: meta.asset,
    description: meta.description,
    capacity: meta.capacity,
    image: meta.image,
    hasSheet: meta.hasSheet,
    price: p.price,
    minted: p.minted,
    totalSupply: p.totalSupply,
    percent: soldPercent(p),
    isReal: true,
  };
}

export default function FeaturedProjects() {
  const { projects: chainProjects, nextProjectId, loading: isLoading } = useOnChainProjects();
  const [showAll, setShowAll] = useState(false);

  const projects: CardProject[] = chainProjects ? chainProjects.map(fromChain) : fallbackProjects();
  const visible = visibleProjects(projects, showAll);
  const canToggle = projects.length > FEATURED_LIMIT;
  // Only projects whose sheet places them in Perú; a project without a sheet has no location.
  const peruCount = projects.filter((p) => p.hasSheet && p.location.includes("Perú")).length;
  // More projects on-chain than listed only past MAX_LISTED_PROJECTS (a corrupt next_project_id).
  const onChainTotal = nextProjectId != null ? Math.max(0, nextProjectId - 1) : null;
  const truncated = chainProjects != null && onChainTotal != null && onChainTotal > chainProjects.length;

  return (
    <section
      id="projects"
      className="w-full max-w-7xl mx-auto px-5 lg:px-10 py-12"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-mono text-[11px] mb-2 uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Emisión Activa de Participaciones · Testnet</span>
          </div>
          <h2 className="font-display text-[24px] leading-[32px] lg:text-[40px] lg:leading-[48px] text-slate-900 font-bold">
            Proyectos Solares Destacados
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold shadow-sm hover:bg-emerald-700 transition-colors">
            Todos ({projects.length})
          </button>
          <button className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[13px] hover:text-slate-900 hover:border-slate-300 font-medium transition-colors">
            Perú ({peruCount})
          </button>
          <button className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[13px] hover:text-slate-900 hover:border-slate-300 font-medium transition-colors">
            Chile (0)
          </button>
        </div>
      </div>

      {truncated && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
          Se listan los primeros {chainProjects?.length} de {onChainTotal} proyectos registrados on-chain.
        </p>
      )}

      {/* Cards */}
      <div id="projects-grid" className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {visible.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-xl bg-white border border-slate-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] relative"
            style={isLoading ? { opacity: 0.85 } : undefined}
          >
            {!p.isReal && !isLoading && (
              <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
                DEMO
              </span>
            )}
            {/* Image (neutral placeholder for a project without a sheet) */}
            <div className="relative h-48 w-full overflow-hidden">
              {p.image ? (
                <>
                  <img
                    className="w-full h-full object-cover"
                    src={p.image}
                    alt={`Imagen ilustrativa de ${p.name}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </>
              ) : (
                <ProjectImagePlaceholder className="h-full w-full" label="Sin imagen" />
              )}

              {/* Price pill */}
              <div className="absolute top-4 right-4 px-4 py-1 rounded-full bg-white/95 border border-emerald-200 shadow-md flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span className="font-mono text-[12px] font-bold text-emerald-700" title="Precio por participación">
                  {formatXlm(p.price)} XLM / participación
                </span>
              </div>

              {/* Asset pill */}
              <div className="absolute bottom-3 left-4 px-3 py-0.5 rounded bg-white/90 backdrop-blur-sm font-mono text-[11px] text-slate-700 font-semibold border border-white/40">
                {p.asset ? `ASSET: ${p.asset} · #${p.id}` : `PROYECTO #${p.id}`}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-display text-slate-900 flex items-center gap-2 font-bold">
                    <span>{p.name}</span>
                    {p.flag && <span className="text-[16px]">{p.flag}</span>}
                  </h3>
                </div>
                {p.location && <p className="text-[12px] text-slate-500 mt-0.5">{p.location}</p>}
                <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                  {p.description}
                </p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-2 gap-3 py-3 rounded-lg bg-slate-50 border border-slate-100 px-4">
                {p.hasSheet ? (
                  <div>
                    <span className="font-mono text-[11px] text-slate-500 block font-medium">
                      CAPACIDAD (DEMO)
                    </span>
                    <span className="font-mono text-[14px] text-slate-900 font-bold">
                      {p.capacity}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-mono text-[11px] text-slate-500 block font-medium">
                      SUPPLY TOTAL
                    </span>
                    <span className="font-mono text-[14px] text-slate-900 font-bold" title="On-chain: total_supply">
                      {p.totalSupply.toString()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-mono text-[11px] text-slate-500 block font-medium">
                    PRECIO / PARTICIPACIÓN
                  </span>
                  <span className="font-mono text-[14px] text-orange-600 font-bold" title={p.isReal ? `On-chain: ${p.price.toString()} stroops` : "Precio demo — valor de fallback"}>
                    {formatXlm(p.price)} XLM
                  </span>
                </div>
              </div>

              {/* Funding progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center font-mono text-[12px]">
                  <span className="text-slate-600 font-medium">
                    Adquirido: {formatXlm(p.minted * p.price, { maxDecimals: 0 })} / {formatXlm(p.totalSupply * p.price, { maxDecimals: 0 })} XLM
                  </span>
                  <span className="text-emerald-700 font-bold" title={p.isReal ? "On-chain: minted / total_supply" : "Demo — datos simulados"}>
                    {p.percent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <a
                href={projectHref(p.id)}
                className="w-full h-11 rounded-lg bg-secondary text-white text-[13px] font-semibold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <span>Participar Ahora</span>
                <span className="material-symbols-outlined text-[18px]">
                  bolt
                </span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* All projects toggle (more than FEATURED_LIMIT) */}
      {canToggle && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            aria-controls="projects-grid"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[13px] font-semibold shadow-sm hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            {showAll ? "Mostrar menos" : `Ver todos los proyectos (${projects.length})`}
            <span className="material-symbols-outlined text-[18px]">
              {showAll ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
