"use client";

import { useState } from "react";
import { CONTRACT_ID, EXPLORER_URL } from "@/lib/contract";

const pillars = [
  {
    icon: "sensors",
    title: "Oráculos IoT Descentralizados",
    desc: "Telemetría de inversores SMA y Huawei conectada vía API de firma múltiple directa a Stellar.",
    iconColor: "text-emerald-600",
  },
  {
    icon: "smart_toy",
    title: "Dispersión Automática de Rendimientos",
    desc: "Sin retrasos contables de 90 días. Los ingresos por venta de energía se distribuyen instantáneamente on-chain.",
    iconColor: "text-orange-600",
  },
  {
    icon: "security",
    title: "Respaldo Real de Activos (RWA)",
    desc: "Cada token representa la titularidad sobre contratos de usufructo solar y flujo de caja con fideicomiso bancario.",
    iconColor: "text-amber-600",
  },
];

export default function TechArchitecture() {
  const [copied, setCopied] = useState(false);
  const shortContract = `${CONTRACT_ID.slice(0, 6)}...${CONTRACT_ID.slice(-4)}`;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <section id="tech" className="w-full bg-gradient-to-b from-emerald-50/50 to-slate-100/70 border-y border-slate-200 py-16 mt-12">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Conceptual + Pillars */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <span className="font-mono text-[11px] uppercase tracking-widest text-orange-700 bg-orange-100 border border-orange-200 px-5 py-2 rounded-full w-fit font-semibold">
              Arquitectura de Confianza Criptográfica
            </span>
            <h2 className="font-display text-[24px] leading-[32px] lg:text-[40px] lg:leading-[48px] text-slate-900 leading-tight font-bold">
              Soroban Smart Contracts + IoT Solar Telemetry
            </h2>
            <p className="text-[14px] text-slate-600 leading-relaxed">
              A diferencia de los bonos verdes opacos, NIKO SUN audita cada
              kilovatio-hora generado mediante medidores inteligentes de grado
              industrial encriptados con claves criptográficas Ed25519 nativas
              de Stellar.
            </p>

            {/* Pillar bullets */}
            <div className="space-y-5 pt-2">
              {pillars.map((p, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    <span
                      className={`material-symbols-outlined ${p.iconColor} text-[20px]`}
                    >
                      {p.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[16px] text-slate-900 font-bold font-display">
                      {p.title}
                    </h4>
                    <p className="text-[13px] text-slate-600 leading-relaxed mt-0.5">
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Code visualizer */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-xl overflow-x-auto font-mono text-[12px] text-slate-700">
              {/* Window bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[12px] text-slate-800 font-semibold">
                    solar_yield_distributor.rs
                  </span>
                </div>
                <span className="font-semibold text-slate-500">
                  DEMO • Testnet • Simulado
                </span>
              </div>

              {/* Code */}
              <div className="space-y-1 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 text-[12px]">
                <div className="text-slate-400">
                  {"// Verificación de Irradiancia y Pago en Bloque"}
                </div>
                <div>
                  <span className="text-amber-600 font-bold">
                    #[contractimpl]
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 font-bold">pub fn</span>{" "}
                  <span className="text-orange-600 font-bold">
                    distribute_energy_yield
                  </span>
                  (env: Env, project_id: BytesN&lt;32&gt;) {"{"}
                </div>
                <div className="pl-4 text-slate-700">
                  let kwh_oracle = OracleClient::new(&amp;env,
                  &amp;project_id);
                </div>
                <div className="pl-4 text-slate-700">
                  let total_generated =
                  kwh_oracle.get_verified_generation();
                </div>
                <div className="pl-4">
                  <span className="text-emerald-700 font-bold">if</span>{" "}
                  <span className="text-slate-700">
                    total_generated &gt; 0 {"{"}
                  </span>
                </div>
                <div className="pl-8 text-slate-700">
                  let revenue_usdc = total_generated * PPA_TARIFF_RATE;
                </div>
                <div className="pl-8">
                  <span className="text-amber-700 font-semibold">
                    env.events().publish((symbol_short!("YIELD"),
                    project_id), revenue_usdc);
                  </span>
                </div>
                <div className="pl-8">
                  <span className="text-emerald-700 font-semibold">
                    Vault::batch_transfer_dividends(&amp;env, revenue_usdc);
                  </span>
                </div>
                <div className="pl-4 text-slate-700">{"}"}</div>
                <div>{"}"}</div>
              </div>

              {/* Contract badge — real testnet ID */}
              <div className="mt-4 p-4 rounded bg-emerald-50/80 border border-emerald-100 flex items-center justify-between text-slate-800 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">
                    verified_user
                  </span>
                  <span className="font-medium text-slate-700 text-[11px] hidden sm:inline">
                    Stellar Testnet Contract:
                  </span>
                  <span className="font-medium text-slate-700 text-[11px] sm:hidden">
                    Contract:
                  </span>
                  <a
                    href={EXPLORER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 font-bold truncate hover:underline"
                    title={CONTRACT_ID}
                  >
                    {shortContract}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 text-[11px] font-medium hover:bg-emerald-50 transition-colors flex items-center gap-1"
                    title="Copiar Contract ID"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                  <a
                    href={EXPLORER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Ver en stellar.expert"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-500 break-all" title={CONTRACT_ID}>
                {CONTRACT_ID}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
