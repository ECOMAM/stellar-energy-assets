"use client";

export default function Hero() {
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
                ~$0.00001/txn
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-[28px] leading-[36px] lg:text-[56px] lg:leading-[64px] text-slate-900 tracking-tight font-bold max-w-2xl">
              Invierte en{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
                Energía Solar
              </span>
              . Gana{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">
                Dividendos Reales
              </span>
              .
            </h1>

            {/* Ledger stamp */}
            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">
                lock_open
              </span>
              <span className="font-medium text-slate-600">
                CONTRACT: SOROBAN-RWA-SOLAR-V2
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-600">
                CONSENSUS: STELLAR SCP
              </span>
            </div>

            {/* Subheadline */}
            <p className="font-body text-[14px] leading-[22px] lg:text-[16px] lg:leading-[26px] text-slate-600 max-w-xl">
              Tokeniza proyectos solares en Stellar. Compra fracciones de paneles
              solares fotovoltaicos, genera energía limpia verificada por IoT y
              reclama tus recompensas on-chain instantáneamente en USDC y XLM.
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
                <span>Conectar Freighter / Lobstr</span>
              </button>
            </div>

            {/* Trust indicators */}
            <div className="pt-2 flex items-center gap-6 text-slate-500 font-mono text-[12px]">
              <div className="flex items-center gap-2" title="Auditoría externa pendiente — prototipo revisado internamente">
                <span className="material-symbols-outlined text-amber-600 text-[16px]">
                  shield
                </span>
                <span className="font-medium text-slate-600">
                  Auditoría pendiente
                </span>
                <span className="px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px]">Security-reviewed prototype</span>
              </div>
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

              {/* Activity stream */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                      currency_exchange
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[13px] text-slate-800 font-medium">
                        Yield Auto-Dispersado
                      </span>
                      <span className="font-mono text-[12px] text-slate-500">
                        Block #51829402 • 1.4s ago
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[14px] text-emerald-600 font-bold">
                      +1,420.50 USDC
                    </span>
                    <div className="font-mono text-[11px] text-slate-500 font-medium">
                      POOL_PERU_NORTE
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-orange-500 text-[18px]">
                      token
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[13px] text-slate-800 font-medium">
                        Compra Fracción Solar
                      </span>
                      <span className="font-mono text-[12px] text-slate-500">
                        GDF7...91XA via Freighter
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[14px] text-orange-600 font-bold">
                      250 SUN-LIMA
                    </span>
                    <div className="font-mono text-[11px] text-slate-500 font-medium">
                      2,500 XLM
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract status */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[12px]">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Oracle Smart Meter ID: 0x8F9...A3</span>
                </div>
                <span className="text-emerald-700 font-bold">
                  99.98% Eficiencia
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
