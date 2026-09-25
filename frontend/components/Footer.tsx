"use client";

import { EXPLORER_URL } from "@/lib/contract";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[24px] font-display font-bold tracking-tight text-slate-900">
                NIKO SUN
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-semibold">
                CONTRATO v2.1 · TESTNET
              </span>
            </div>
            <p className="text-[13px] text-slate-600 max-w-md leading-relaxed">
              Demo de participaciones en proyectos solares ficticios,
              registradas on-chain en Stellar testnet, con reparto proporcional
              de los ingresos que deposita el emisor.
            </p>
            <div className="font-mono text-[12px] text-emerald-700 font-semibold">
              Built by NIKO-SUN • Powered by Stellar Soroban
            </div>
          </div>

          {/* Ecosystem links */}
          <div className="flex flex-col space-y-3">
            <span className="text-[13px] text-slate-900 font-bold uppercase tracking-wider">
              Ecosistema
            </span>
            <a
              href="#projects"
              className="text-[13px] text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Proyectos Solares
            </a>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Contrato en Stellar Expert
            </a>
            <a
              href="https://github.com/ECOMAM/stellar-energy-assets/blob/main/docs/ciclo-onchain-testnet.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Evidencia on-chain (testnet)
            </a>
            <a
              href="https://github.com/ECOMAM/stellar-energy-assets#roadmap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Roadmap (oráculo IoT, KYC, anchors)
            </a>
          </div>

          {/* Resources links */}
          <div className="flex flex-col space-y-3">
            <span className="text-[13px] text-slate-900 font-bold uppercase tracking-wider">
              Recursos & Red
            </span>
            <a
              href="https://github.com/ECOMAM/stellar-energy-assets#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              <span>Documentación (README)</span>
              <span className="material-symbols-outlined text-[14px]">
                open_in_new
              </span>
            </a>
            <a
              href="https://github.com/ECOMAM/stellar-energy-assets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 hover:text-orange-600 transition-colors"
              title="Repositorio del proyecto: github.com/ECOMAM/stellar-energy-assets"
            >
              Código en GitHub
            </a>
            <a
              href="https://github.com/ECOMAM/stellar-energy-assets/blob/main/docs/security-audit.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-slate-600 hover:text-orange-600 transition-colors"
            >
              Revisión de seguridad del contrato
            </a>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[11px] leading-relaxed">
          <strong className="text-slate-900 font-semibold">
            Aviso legal (demo):
          </strong>{" "}
          Demo en Stellar testnet con proyectos ficticios y datos simulados. Sin fondos reales. No es una oferta de inversión ni promete retornos.{" "}
          Las participaciones son registros internos del contrato Soroban,
          anotados on-chain y no transferibles. Cuando el emisor deposita
          ingresos en el contrato, este los reparte en proporción a las
          participaciones y cada participante reclama su parte. No existen
          contratos de compraventa de energía ni acuerdos legales detrás de
          estos proyectos, y las participaciones no otorgan derechos sobre
          ningún activo real.
        </div>
      </div>
    </footer>
  );
}
