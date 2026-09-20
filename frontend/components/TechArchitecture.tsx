"use client";

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
  return (
    <section id="tech" className="w-full bg-gradient-to-b from-emerald-50/50 dark:from-[#0a2e1a]/50 to-slate-100/70 dark:to-[#131b2e]/70 border-y border-slate-200 dark:border-[#3c4a42] py-16 mt-12">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Conceptual + Pillars */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <span className="font-mono text-[11px] uppercase tracking-widest text-orange-700 dark:text-[#ffb690] bg-orange-100 dark:bg-[#2a1500] border border-orange-200 dark:border-[#3d1f00] px-5 py-2 rounded-full w-fit font-semibold">
              Arquitectura de Confianza Criptográfica
            </span>
            <h2 className="font-display text-[24px] leading-[32px] lg:text-[40px] lg:leading-[48px] text-slate-900 dark:text-[#dae2fd] leading-tight font-bold">
              Soroban Smart Contracts + IoT Solar Telemetry
            </h2>
            <p className="text-[14px] text-slate-600 dark:text-[#bbcabf] leading-relaxed">
              A diferencia de los bonos verdes opacos, NIKO SUN audita cada
              kilovatio-hora generado mediante medidores inteligentes de grado
              industrial encriptados con claves criptográficas Ed25519 nativas
              de Stellar.
            </p>

            {/* Pillar bullets */}
            <div className="space-y-5 pt-2">
              {pillars.map((p, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#222a3d] border border-slate-200 dark:border-[#3c4a42] flex items-center justify-center shrink-0 shadow-sm">
                    <span
                      className={`material-symbols-outlined ${p.iconColor} text-[20px]`}
                    >
                      {p.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[16px] text-slate-900 dark:text-[#dae2fd] font-bold font-display">
                      {p.title}
                    </h4>
                    <p className="text-[13px] text-slate-600 dark:text-[#bbcabf] leading-relaxed mt-0.5">
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Code visualizer */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-white dark:bg-[#222a3d] border border-slate-200 dark:border-[#3c4a42] p-6 shadow-xl overflow-x-auto font-mono text-[12px] text-slate-700 dark:text-[#bbcabf]">
              {/* Window bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-[#3c4a42] text-slate-400 dark:text-[#86948a]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[12px] text-slate-800 dark:text-[#dae2fd] font-semibold">
                    solar_yield_distributor.rs
                  </span>
                </div>
                <span className="font-semibold text-slate-500 dark:text-[#86948a]">
                  SOROBAN-WASM
                </span>
              </div>

              {/* Code */}
              <div className="space-y-1 leading-relaxed bg-slate-50 dark:bg-[#131b2e] p-4 rounded-lg border border-slate-200 dark:border-[#3c4a42] text-[12px]">
                <div className="text-slate-400 dark:text-[#86948a]">
                  {"// Verificación de Irradiancia y Pago en Bloque"}
                </div>
                <div>
                  <span className="text-amber-600 dark:text-[#f9bd22] font-bold">
                    #[contractimpl]
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 dark:text-[#4edea3] font-bold">pub fn</span>{" "}
                  <span className="text-orange-600 dark:text-[#ffb690] font-bold">
                    distribute_energy_yield
                  </span>
                  (env: Env, project_id: BytesN&lt;32&gt;) {"{"}
                </div>
                <div className="pl-4 text-slate-700 dark:text-[#bbcabf]">
                  let kwh_oracle = OracleClient::new(&amp;env,
                  &amp;project_id);
                </div>
                <div className="pl-4 text-slate-700 dark:text-[#bbcabf]">
                  let total_generated =
                  kwh_oracle.get_verified_generation();
                </div>
                <div className="pl-4">
                  <span className="text-emerald-700 dark:text-[#4edea3] font-bold">if</span>{" "}
                  <span className="text-slate-700 dark:text-[#bbcabf]">
                    total_generated &gt; 0 {"{"}
                  </span>
                </div>
                <div className="pl-8 text-slate-700 dark:text-[#bbcabf]">
                  let revenue_usdc = total_generated * PPA_TARIFF_RATE;
                </div>
                <div className="pl-8">
                  <span className="text-amber-700 dark:text-[#f9bd22] font-semibold">
                    env.events().publish((symbol_short!("YIELD"),
                    project_id), revenue_usdc);
                  </span>
                </div>
                <div className="pl-8">
                  <span className="text-emerald-700 dark:text-[#4edea3] font-semibold">
                    Vault::batch_transfer_dividends(&amp;env, revenue_usdc);
                  </span>
                </div>
                <div className="pl-4 text-slate-700 dark:text-[#bbcabf]">{"}"}</div>
                <div>{"}"}</div>
              </div>

              {/* Hash badge */}
              <div className="mt-4 p-4 rounded bg-emerald-50/80 dark:bg-[#0a2e1a] border border-emerald-100 dark:border-[#0a3d22] flex items-center justify-between text-slate-800 dark:text-[#dae2fd]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-[#4edea3] text-[18px]">
                    verified_user
                  </span>
                  <span className="font-medium text-slate-700 dark:text-[#bbcabf]">
                    Stellar Soroban Mainnet Hash:
                  </span>
                </div>
                <span className="text-[12px] text-emerald-700 dark:text-[#4edea3] font-bold">
                  0x4a9b...f910e
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
