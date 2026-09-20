"use client";

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-[#171f33] border-t border-slate-200 dark:border-[#3c4a42] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[24px] font-display font-bold tracking-tight text-slate-900 dark:text-[#dae2fd]">
                NIKO SUN
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-[#0a2e1a] border border-emerald-200 dark:border-[#0a3d22] text-emerald-800 dark:text-[#4edea3] font-mono text-[11px] font-semibold">
                V2.4 PROTOCOL
              </span>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-[#bbcabf] max-w-md leading-relaxed">
              Descentralizando la titularidad de activos solares en América
              Latina. Democratizamos la inversión en energía limpia con
              liquidación instantánea respaldada en Stellar.
            </p>
            <div className="font-mono text-[12px] text-emerald-700 dark:text-[#4edea3] font-semibold">
              Built by NIKO-SUN • Powered by Stellar Soroban
            </div>
          </div>

          {/* Ecosystem links */}
          <div className="flex flex-col space-y-3">
            <span className="text-[13px] text-slate-900 dark:text-[#dae2fd] font-bold uppercase tracking-wider">
              Ecosistema
            </span>
            <a
              href="#projects"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-emerald-700 dark:hover:text-[#4edea3] transition-colors"
            >
              Proyectos Solares
            </a>
            <a
              href="https://stellar.expert"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-emerald-700 dark:hover:text-[#4edea3] transition-colors"
            >
              Stellar Explorer (Ledger)
            </a>
            <a
              href="#"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-emerald-700 dark:hover:text-[#4edea3] transition-colors"
            >
              Oráculo IoT Telemetría
            </a>
            <a
              href="#"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-emerald-700 dark:hover:text-[#4edea3] transition-colors"
            >
              Calculadora de Yield
            </a>
          </div>

          {/* Resources links */}
          <div className="flex flex-col space-y-3">
            <span className="text-[13px] text-slate-900 dark:text-[#dae2fd] font-bold uppercase tracking-wider">
              Recursos & Red
            </span>
            <a
              href="#"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-orange-600 dark:hover:text-[#ffb690] transition-colors flex items-center gap-1"
            >
              <span>Documentación (Docs)</span>
              <span className="material-symbols-outlined text-[14px]">
                open_in_new
              </span>
            </a>
            <a
              href="https://github.com/NIKOSUN-ORG/niko-sun-stellar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-orange-600 dark:hover:text-[#ffb690] transition-colors"
            >
              GitHub Contracts
            </a>
            <a
              href="#"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-orange-600 dark:hover:text-[#ffb690] transition-colors"
            >
              Discord Comunitario
            </a>
            <a
              href="#"
              className="text-[13px] text-slate-600 dark:text-[#bbcabf] hover:text-orange-600 dark:hover:text-[#ffb690] transition-colors"
            >
              Twitter / X Protocol
            </a>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-[#3c4a42] text-slate-600 dark:text-[#bbcabf] font-mono text-[11px] leading-relaxed">
          <strong className="text-slate-900 dark:text-[#dae2fd] font-semibold">
            Aviso de Riesgo y Descargo Legal RWA:
          </strong>{" "}
          La adquisición de tokens representativos de infraestructura solar
          fotovoltaica implica riesgos de rendimiento operativo, condiciones
          climáticas fluctuantes de irradiación y riesgos inherentes a la
          tecnología blockchain de Stellar Network. Los rendimientos proyectados
          (APY) se basan en contratos de compraventa de energía (PPA) y
          promedios históricos de producción, no constituyen una garantía
          bancaria de retorno de inversión. Verifique la legislación aplicable
          en su jurisdicción antes de comprometer fondos en activos reales
          tokenizados (Real-World Assets).
        </div>
      </div>
    </footer>
  );
}
