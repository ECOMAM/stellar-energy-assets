"use client";

import { EXPLORER_URL } from "@/lib/contract";
import { useHolderMetrics } from "@/hooks/useHolderMetrics";
import { useOnChainProjects } from "@/hooks/useOnChainProjects";
import { formatHolderCount, formatLastIndexed } from "@/lib/holderIndexer";
import { stroopsToXlmNumber } from "@/lib/units";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export default function StatsBar() {
  const { metrics: holderMetrics, loading: holderLoading } = useHolderMetrics();
  const { projects, loading: isLoading } = useOnChainProjects();

  // supply x price of every project, in XLM (price is u128 stroops on-chain).
  const totalValueStroops = projects ? projects.reduce((acc, p) => acc + p.totalSupply * p.price, BigInt(0)) : null;
  const totalEnergy = projects ? projects.reduce((acc, p) => acc + p.totalEnergyKwh, BigInt(0)) : null;
  const chain = {
    totalTokenizedXlm:
      totalValueStroops != null && totalValueStroops > BigInt(0)
        ? `${compact.format(stroopsToXlmNumber(totalValueStroops))} XLM`
        : null,
    projectsCount: projects ? projects.length : null,
    energyKwh: totalEnergy != null ? totalEnergy.toLocaleString("en-US") : null,
  };
  const isDemoChain = chain.totalTokenizedXlm == null && chain.projectsCount == null;

  const staticCards = [
    {
      label: "Total Tokenizado",
      value: chain.totalTokenizedXlm ?? "15.5K XLM",
      sub: chain.totalTokenizedXlm != null ? "Testnet · On-chain (supply × precio)" : "Testnet · valor demo",
      subColor: "text-emerald-700",
      icon: "monetization_on",
      iconColor: "text-emerald-600",
      isDemo: chain.totalTokenizedXlm == null,
    },
    {
      label: "Proyectos Activos",
      value: chain.projectsCount != null ? String(chain.projectsCount) : "3",
      sub: "Registrados on-chain por emisores verificados",
      subColor: "text-orange-600",
      icon: "solar_power",
      iconColor: "text-orange-500",
      isDemo: chain.projectsCount == null,
    },
  ];

  const energyCard = {
    label: "Energía Limpia",
    value: chain.energyKwh ?? "3,990",
    unit: "kWh",
    sub: "Reportada por el emisor y anclada on-chain",
    subColor: "text-emerald-700",
    icon: "eco",
    iconColor: "text-emerald-600",
    isDemo: chain.energyKwh == null,
  };

  const holderCountValue =
    holderMetrics?.holderCount !== null && holderMetrics?.holderCount !== undefined
      ? formatHolderCount(holderMetrics.holderCount)
      : "—";
  const holderIsIndexing =
    holderLoading && (holderMetrics?.holderCount == null);
  // Even after loading, if holderCount is null we are indexing
  const showIndexing =
    holderMetrics?.holderCount === null || holderMetrics?.status === "indexing" || holderLoading;

  return (
    <section className="w-full max-w-7xl mx-auto px-5 lg:px-10 -mt-3">
      {isDemoChain && !isLoading && (
        <div className="mb-3 flex justify-end">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
            DEMO • Testnet
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {staticCards.map((m, i) => (
          <div
            key={i}
            className="flex flex-col p-5 rounded-xl bg-white border border-emerald-100 shadow-md transition-all duration-300 hover:shadow-lg hover:border-emerald-200 relative"
            style={isLoading ? { opacity: 0.85 } : undefined}
          >
            {m.isDemo && !isLoading && (
              <span className="absolute top-2 right-2 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
                DEMO
              </span>
            )}
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[13px] tracking-wide uppercase font-semibold text-slate-500">{m.label}</span>
              <span className={`material-symbols-outlined ${m.iconColor} text-[20px]`}>{m.icon}</span>
            </div>
            <span className="font-mono text-[20px] leading-[28px] lg:text-[40px] lg:leading-[48px] text-slate-900 mt-3 font-bold tracking-tight">
              {m.value}
            </span>
            <span className={`font-mono text-[11px] ${m.subColor} font-semibold mt-2`}>{m.sub}</span>
          </div>
        ))}

        {/* Holder card — dynamic, no hardcoded number */}
        <div className="flex flex-col p-5 rounded-xl bg-white border border-emerald-100 shadow-md transition-all duration-300 hover:shadow-lg hover:border-emerald-200 relative">
          {showIndexing && !holderLoading ? (
            <span className="absolute top-2 right-2 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
              Indexing
            </span>
          ) : null}
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[13px] tracking-wide uppercase font-semibold text-slate-500">
              Participantes Globales
            </span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">group</span>
          </div>
          <span className="font-mono text-[20px] leading-[28px] lg:text-[40px] lg:leading-[48px] text-slate-900 mt-3 font-bold tracking-tight inline-flex items-baseline gap-2">
            {showIndexing ? (
              <span className="inline-flex items-center gap-2">
                <span>{holderCountValue}</span>
                <span className="font-mono text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 animate-pulse">
                  Indexing...
                </span>
              </span>
            ) : (
              holderCountValue
            )}
          </span>
          <span className="font-mono text-[11px] text-amber-700 font-semibold mt-2">Cuentas con participaciones (eventos purchase + get_portfolio)</span>
          <span className="font-mono text-[10px] text-slate-500 mt-1">
            {holderMetrics?.lastIndexedAt ? `Updated ${formatLastIndexed(holderMetrics.lastIndexedAt)}` : "Updated —"}
          </span>
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-emerald-700 hover:text-emerald-800 hover:underline mt-1 inline-flex items-center gap-1"
          >
            Indexed from Stellar Testnet · View ledger
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </a>
        </div>

        <div
          className="flex flex-col p-5 rounded-xl bg-white border border-emerald-100 shadow-md transition-all duration-300 hover:shadow-lg hover:border-emerald-200 relative"
          style={isLoading ? { opacity: 0.85 } : undefined}
        >
          {energyCard.isDemo && !isLoading && (
            <span className="absolute top-2 right-2 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
              DEMO
            </span>
          )}
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[13px] tracking-wide uppercase font-semibold text-slate-500">{energyCard.label}</span>
            <span className={`material-symbols-outlined ${energyCard.iconColor} text-[20px]`}>{energyCard.icon}</span>
          </div>
          <span className="font-mono text-[20px] leading-[28px] lg:text-[40px] lg:leading-[48px] text-slate-900 mt-3 font-bold tracking-tight">
            {energyCard.value}
            {energyCard.unit && (
              <span className="text-[20px] font-normal text-slate-500"> {energyCard.unit}</span>
            )}
          </span>
          <span className={`font-mono text-[11px] ${energyCard.subColor} font-semibold mt-2`}>{energyCard.sub}</span>
        </div>
      </div>
    </section>
  );
}
