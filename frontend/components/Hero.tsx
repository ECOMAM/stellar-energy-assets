"use client";

import { useEffect, useState } from "react";
import { CONTRACT_ID, EXPLORER_URL, TX_EXPLORER } from "@/lib/contract";
import { fetchContractEvents, parseDepositEvent, type DepositEvent } from "@/lib/events";
import { parsePurchaseEvent, type PurchaseEvent } from "@/lib/holderIndexer";
import { formatXlm } from "@/lib/units";

/** One row of the telemetry HUD activity feed: a real on-chain deposit or purchase event. */
type ActivityItem = {
  kind: "deposit" | "purchase";
  projectId: number;
  amountXlm: string;
  txHash: string;
  ledger: number;
};

function shortHash(h: string) {
  if (!h) return "—";
  return h.slice(0, 4) + "..." + h.slice(-4);
}

function shortContract(id: string) {
  if (!id) return "—";
  return id.slice(0, 6) + "…" + id.slice(-4);
}

export default function Hero() {
  /* ── Latest on-chain activity (deposit/purchase events) — real RPC data only ── */
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [depositEvents, purchaseEvents] = await Promise.all([
          fetchContractEvents("deposit", ["*"]),
          fetchContractEvents("purchase", ["*", "*"]),
        ]);
        const deposits = depositEvents
          .map(parseDepositEvent)
          .filter((e): e is DepositEvent => e !== null);
        const purchases = purchaseEvents
          .map(parsePurchaseEvent)
          .filter((e): e is PurchaseEvent => e !== null);
        const merged: ActivityItem[] = [
          ...deposits.map((d) => ({
            kind: "deposit" as const,
            projectId: Number(d.projectId),
            amountXlm: formatXlm(d.amount),
            txHash: d.txHash,
            ledger: d.ledger,
          })),
          ...purchases.map((p) => ({
            kind: "purchase" as const,
            projectId: Number(p.projectId),
            amountXlm: formatXlm(p.totalPrice),
            txHash: p.txHash ?? "",
            ledger: p.ledger ?? 0,
          })),
        ]
          .sort((a, b) => b.ledger - a.ledger)
          .slice(0, 2);
        if (!cancelled) setActivity(merged);
      } catch (e) {
        console.warn("Hero: activity feed fetch failed", e);
        if (!cancelled) setActivity(null);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative w-full overflow-hidden pb-10 bg-gradient-to-b from-emerald-50/60 via-white to-surface">
      {/* Ambient glow effects */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-200/20 via-emerald-100/30 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-96 h-96 bg-emerald-200/20 blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-8 lg:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* ── Left Column: Copy & CTA ── */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-5">
            {/* Protocol badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-emerald-200 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
              <span className="font-mono text-[11px] tracking-wider text-slate-700 font-semibold uppercase">
                Built on Stellar <span className="text-slate-400">/</span> 5s
                settlement <span className="text-slate-400">/</span>{" "}
                &lt; 0.1 XLM/txn (testnet)
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[28px] leading-[36px] lg:text-[56px] lg:leading-[64px] text-slate-900 tracking-tight font-bold max-w-2xl">
              Participa en{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
                Energía Solar
              </span>
              . Energía Real,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">
                Trazable On-Chain
              </span>
              .
            </h1>

            {/* Ledger stamp */}
            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">
                lock_open
              </span>
              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-600 hover:text-emerald-700 hover:underline"
                title={CONTRACT_ID}
              >
                CONTRACT: {shortContract(CONTRACT_ID)}
              </a>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-600">
                CONSENSUS: STELLAR SCP
              </span>
            </div>

            {/* Subheadline */}
            <p className="font-body text-[14px] leading-[22px] lg:text-[16px] lg:leading-[26px] text-slate-600 max-w-xl">
              Tokeniza proyectos solares en Stellar. Adquiere participaciones de
              proyectos solares demo con XLM, sigue la energía que el emisor ancla
              on-chain y reclama tu parte proporcional de los ingresos en XLM.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
              <a
                href="#projects"
                className="h-11 px-8 rounded-lg bg-emerald-600 text-white text-[14px] font-semibold shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition-all flex items-center gap-2 group"
              >
                <span>Explorar Proyectos</span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                  solar_power
                </span>
              </a>
              <button className="h-11 px-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-[14px] font-semibold shadow-sm transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">
                  account_balance_wallet
                </span>
                <span>Conectar Freighter</span>
              </button>
            </div>

            {/* Compliance disclaimer */}
            <p className="text-[11px] leading-relaxed text-slate-400 max-w-md">
              Demo en Stellar testnet con activos y datos simulados. Sin fondos reales. No es una oferta de inversión ni promete retornos.
            </p>

            {/* Trust indicators */}
            <div className="pt-2 flex items-center gap-6 text-slate-500 font-mono text-[12px]">
              <a
                href="https://github.com/ECOMAM/stellar-energy-assets/blob/integracion/niko-sun/docs/security-audit.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-emerald-700"
                title="Ver la revisión de seguridad del contrato"
              >
                <span className="material-symbols-outlined text-amber-600 text-[16px]">
                  shield
                </span>
                <span className="font-medium text-slate-600">
                  Revisión de seguridad del contrato
                </span>
                <span className="px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px]">Security-reviewed prototype</span>
              </a>
              <div className="flex items-center gap-2" title="Telemetría simulada en testnet">
                <span className="material-symbols-outlined text-amber-500 text-[16px]">
                  bolt
                </span>
                <span className="font-medium text-slate-600">
                  IoT • Demo telemetry
                </span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Telemetry HUD ── */}
          <div className="lg:col-span-5 relative mt-8 lg:mt-0">
            <div className="relative w-full rounded-xl bg-white border border-emerald-100 p-6 shadow-xl shadow-emerald-950/5 overflow-hidden">
              {/* HUD Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.5)]" />
                  <span className="text-[20px] font-display font-bold text-slate-900">
                    Panel Telemetry HUD
                  </span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-semibold" title="Datos simulados en testnet">
                  DEMO • Testnet
                </span>
              </div>

              {/* Solar Grid SVG */}
              <div className="relative w-full h-48 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-3 mt-4">
                <svg
                  className="w-full h-full text-slate-300"
                  fill="none"
                  viewBox="0 0 320 160"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="solar-grid"
                      height="32"
                      patternUnits="userSpaceOnUse"
                      width="32"
                    >
                      <path
                        d="M 32 0 L 0 0 0 32"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray="2 2"
                        strokeWidth="0.8"
                      />
                      <circle cx="16" cy="16" fill="#059669" opacity="0.4" r="1.5" />
                    </pattern>
                    <linearGradient id="irradiance" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#ea580c" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <rect fill="url(#solar-grid)" height="160" width="320" />
                  <path
                    d="M20,130 C80,80 140,110 210,40 S290,60 310,20"
                    fill="none"
                    stroke="url(#irradiance)"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                  <circle className="animate-ping" cx="210" cy="40" fill="#059669" r="4" />
                  <circle cx="210" cy="40" fill="#059669" r="3" />
                  <circle cx="80" cy="80" fill="#f59e0b" r="3" />
                </svg>

                {/* Sensor overlays */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-white/95 border border-slate-200 shadow-sm backdrop-blur-md">
                  <span className="font-mono text-[12px] text-orange-600 font-semibold">
                    Irradiancia: 984 W/m²
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-white/95 border border-slate-200 shadow-sm backdrop-blur-md">
                  <span className="font-mono text-[12px] text-emerald-700 font-semibold">
                    Inyección Red: 142.8 kWh
                  </span>
                </div>
              </div>

              {/* Activity stream — real on-chain deposit/purchase events (Soroban RPC) */}
              <div className="mt-4 space-y-2 min-h-[88px]">
                {activityLoading ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-[12px] text-slate-500">
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      autorenew
                    </span>
                    Cargando actividad on-chain…
                  </div>
                ) : activity === null ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-[12px] text-slate-500">
                    No se pudo leer la actividad on-chain desde la RPC.
                  </div>
                ) : activity.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-[12px] text-slate-500">
                    Sin actividad reciente en la ventana de la RPC.
                  </div>
                ) : (
                  activity.map((item, i) => (
                    <div
                      key={`${item.txHash}-${i}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            item.kind === "deposit" ? "text-emerald-600" : "text-orange-500"
                          }`}
                        >
                          {item.kind === "deposit" ? "currency_exchange" : "token"}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-slate-800 font-medium">
                            {item.kind === "deposit"
                              ? "Depósito de ingresos (deposit_revenue)"
                              : "Compra de participaciones (purchase_tokens)"}
                          </span>
                          <span className="font-mono text-[12px] text-slate-500">
                            Ledger #{item.ledger} ·{" "}
                            <a
                              href={TX_EXPLORER(item.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-emerald-700"
                            >
                              {shortHash(item.txHash)}
                            </a>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono text-[14px] font-bold ${
                            item.kind === "deposit" ? "text-emerald-600" : "text-orange-600"
                          }`}
                        >
                          {item.kind === "deposit" ? "+" : ""}
                          {item.amountXlm} XLM
                        </span>
                        <div className="font-mono text-[11px] text-slate-500 font-medium">
                          Proyecto #{item.projectId}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Contract status */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 font-mono text-[12px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Oráculo IoT firmado: roadmap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
