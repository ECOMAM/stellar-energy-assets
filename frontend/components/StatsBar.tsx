"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ID } from "@/lib/contract";

type ChainMetrics = {
  totalTokenizedXlm: string | null;
  projectsCount: number | null;
  energyKwh: string | null;
};

export default function StatsBar() {
  const { readContract } = useWallet();
  const [chain, setChain] = useState<ChainMetrics>({ totalTokenizedXlm: null, projectsCount: null, energyKwh: null });
  const [isLoading, setIsLoading] = useState(true);
  const isDemo = chain.totalTokenizedXlm == null && chain.projectsCount == null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = await import("@stellar/stellar-sdk");
        const decode = (val: unknown) => {
          try {
            return (sdk as unknown as { scValToNative: (v: unknown) => unknown }).scValToNative(val as never);
          } catch {
            return val;
          }
        };
        let nextId = 1;
        try {
          const rawNext = await readContract(CONTRACT_ID, "next_project_id", []);
          const d = decode(rawNext);
          if (typeof d === "bigint") nextId = Number(d);
          else if (typeof d === "number") nextId = d;
          else nextId = Number(d as string);
        } catch {
          nextId = 4;
        }
        const ids = [];
        for (let i = 1; i < nextId; i++) ids.push(i);
        const fetchIds = ids.length > 0 ? ids.slice(0, 12) : [1, 2, 3];
        let totalValue = BigInt(0);
        let totalEnergy = BigInt(0);
        let successCount = 0;
        for (const id of fetchIds) {
          try {
            const raw = await readContract(CONTRACT_ID, "get_project", [id]);
            const p = decode(raw) as Record<string, unknown>;
            const totalSupply = BigInt((p.total_supply ?? p.totalSupply ?? 0) as string | number | bigint);
            const price = BigInt((p.price ?? 0) as string | number | bigint);
            const energy = BigInt((p.total_energy_kwh ?? p.totalEnergyKwh ?? 0) as string | number | bigint);
            totalValue += totalSupply * price;
            totalEnergy += energy;
            successCount++;
          } catch {
            // keep mock for this id
          }
        }
        // Also try get_total_sales for cross-check (not displayed directly)
        try {
          await readContract(CONTRACT_ID, "get_total_sales", []);
        } catch {
          // ignore
        }
        if (cancelled) return;
        const xlmTotal = Number(totalValue) / 1_000_000;
        const tokenizedStr =
          xlmTotal >= 1_000_000
            ? `$${(xlmTotal * 0.13 / 1_000_000).toFixed(1)}M`
            : xlmTotal >= 1000
              ? `${(xlmTotal / 1000).toFixed(1)}k XLM`
              : xlmTotal > 0
                ? `${xlmTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })} XLM`
                : null;
        const energyStr = totalEnergy > BigInt(0) ? Number(totalEnergy).toLocaleString("en-US") : null;
        setChain({
          totalTokenizedXlm: tokenizedStr,
          projectsCount: successCount > 0 ? (nextId > 1 ? nextId - 1 : successCount) : null,
          energyKwh: energyStr,
        });
      } catch (e) {
        console.warn("StatsBar chain fetch failed", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readContract]);

  const metrics = [
    {
      label: "Total Tokenizado",
      value: chain.totalTokenizedXlm ?? "$2.4M+",
      sub: "En Activos Físicos Fotovoltaicos",
      subColor: "text-emerald-700",
      icon: "monetization_on",
      iconColor: "text-emerald-600",
      isDemo: chain.totalTokenizedXlm == null,
    },
    {
      label: "Proyectos Activos",
      value: chain.projectsCount != null ? String(chain.projectsCount) : "12",
      sub: "Auditados y Conectados a Red",
      subColor: "text-orange-600",
      icon: "solar_power",
      iconColor: "text-orange-500",
      isDemo: chain.projectsCount == null,
    },
    {
      label: "Inversores Globales",
      value: "847",
      sub: "Cobrando Rendimientos Diarios",
      subColor: "text-amber-700",
      icon: "group",
      iconColor: "text-amber-600",
      isDemo: true,
    },
    {
      label: "Energía Limpia",
      value: chain.energyKwh ?? "1.2M",
      unit: "kWh",
      sub: "890 Toneladas CO₂ Evitadas",
      subColor: "text-emerald-700",
      icon: "eco",
      iconColor: "text-emerald-600",
      isDemo: chain.energyKwh == null,
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-5 lg:px-10 -mt-3">
      {isDemo && !isLoading && (
        <div className="mb-3 flex justify-end">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
            DEMO • Testnet
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
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
              <span className="text-[13px] tracking-wide uppercase font-semibold text-slate-500">
                {m.label}
              </span>
              <span
                className={`material-symbols-outlined ${m.iconColor} text-[20px]`}
              >
                {m.icon}
              </span>
            </div>
            <span className="font-mono text-[20px] leading-[28px] lg:text-[40px] lg:leading-[48px] text-slate-900 mt-3 font-bold tracking-tight">
              {m.value}
              {m.unit && (
                <span className="text-[20px] font-normal text-slate-500">
                  {" "}
                  {m.unit}
                </span>
              )}
            </span>
            <span
              className={`font-mono text-[11px] ${m.subColor} font-semibold mt-2`}
            >
              {m.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
