"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PdfCertificate from "@/components/PdfCertificate";
import { TX_EXPLORER } from "@/lib/contract";

/* ──────────────────── Types ──────────────────── */

interface TransactionSuccessProps {
  open: boolean;
  onClose: () => void;
  txHash: string;
  tokenCount: number;
  costXlm: number;
  projectName: string;
  projectFlag: string;
  assetId: string;
  walletAddress: string;
  /** illustrative capacity; null for a project without a descriptive sheet
   *  (then no illustrative figure, capacity or CO₂, is shown) */
  capacityWp: number | null;
  contractId: string;
  /** off-chain demo location of the project */
  location?: string;
}

/* ──────────────────── Helpers ──────────────────── */

function shortAddr(a: string) {
  if (!a) return "—";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function shortHash(h: string) {
  if (!h) return "—";
  return h.slice(0, 6) + "..." + h.slice(-4);
}

/* ──────────────────── Component ──────────────────── */

export default function TransactionSuccess({
  open,
  onClose,
  txHash,
  tokenCount,
  costXlm,
  projectName,
  projectFlag,
  assetId,
  walletAddress,
  capacityWp,
  contractId,
  location = "Perú (demo)",
}: TransactionSuccessProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  if (!open) return null;

  const co2Kg = tokenCount * 0.32 * 1000; // illustrative estimate, kg per year

  function handleCopy() {
    navigator.clipboard?.writeText(txHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/45 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* ── Top eco ribbon ── */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400" />

        {/* ── SCP status banner ── */}
        <div className="flex justify-center pt-8 pb-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-50 shadow-sm border border-emerald-200">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[11px] text-emerald-700 uppercase tracking-wider font-semibold">
              Stellar Consensus Protocol (SCP) Finalizado
            </span>
            <span className="text-emerald-300">·</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Tx confirmada
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12">
          {/* ── Success header ── */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
            {/* Animated icon ring */}
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 shadow-md mb-5">
              <div className="absolute inset-0 rounded-full bg-emerald-200/30 animate-ping" />
              <span className="material-symbols-outlined text-emerald-600 text-[40px]">
                verified
              </span>
            </div>
            <span className="text-[12px] text-orange-600 font-bold uppercase tracking-wider mb-2">
              Compra registrada on-chain
            </span>
            <h1 className="font-display text-[26px] font-bold text-slate-900 mb-3">
              ¡Participación Confirmada!
            </h1>
            <p className="text-[14px] text-slate-600 max-w-lg leading-relaxed">
              Registraste {tokenCount} {tokenCount === 1 ? "participación" : "participaciones"} en el proyecto demo{" "}
              <strong className="text-slate-900 font-semibold">
                {projectFlag} {projectName}
              </strong>
              . El contrato Soroban recibió tus XLM y guarda tu balance on-chain
              (no se emite un token a tu wallet).
            </p>

            {/* Tx hash pill */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 bg-slate-100/60 px-4 py-2 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                Hash Tx:
              </span>
              <code className="text-[12px] text-slate-900 font-mono font-bold">
                {shortHash(txHash)}
              </code>
              <button
                onClick={handleCopy}
                className="text-emerald-600 hover:text-emerald-800 transition-colors inline-flex items-center text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? "check" : "content_copy"}
                </span>
              </button>
              <span className="text-slate-300">|</span>
              <a
                href={TX_EXPLORER(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-semibold"
              >
                Ver en StellarExpert
                <span className="material-symbols-outlined text-xs">
                  open_in_new
                </span>
              </a>
            </div>
          </div>

          {/* ── Split view: Certificate + Metrics ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
            {/* LEFT: NFT Usufruct Certificate (7 cols) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 flex flex-col relative overflow-hidden border border-slate-200">
                {/* Watermark */}
                <div className="absolute -right-12 -bottom-12 w-64 h-64 opacity-[0.03] pointer-events-none text-emerald-600">
                  <span className="material-symbols-outlined text-[240px]">
                    solar_power
                  </span>
                </div>

                {/* Certificate header */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-orange-600 text-xl">
                        workspace_premium
                      </span>
                      <span className="text-[11px] text-orange-600 font-bold tracking-widest uppercase">
                        Comprobante demo · sin valor legal
                      </span>
                    </div>
                    <h3 className="font-display text-[17px] font-bold text-slate-900 tracking-tight">
                      COMPROBANTE DE PARTICIPACIÓN (DEMO)
                    </h3>
                    <span className="text-[12px] text-slate-500">
                      Stellar testnet · contrato Soroban v2.1
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-[11px] font-bold font-mono">
                      Tx {shortHash(txHash)}
                    </span>
                  </div>
                </div>

                {/* Asset preview + metadata */}
                <div className="my-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="sm:col-span-1 h-24 rounded overflow-hidden relative">
                    <img
                      src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=300&h=200&fit=crop"
                      alt="Parque Solar"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur">
                      IMAGEN ILUSTRATIVA
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex flex-col justify-center">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">
                      Activo Subyacente
                    </span>
                    <span className="text-[15px] font-bold text-slate-900">
                      {projectFlag} {projectName}
                    </span>
                    <span className="text-[12px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-sm">
                        location_on
                      </span>
                      {location}
                    </span>
                  </div>
                </div>

                {/* Legal metadata grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 py-4 text-left">
                  <div>
                    <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                      Contrato
                    </span>
                    <span className="text-[13px] text-slate-900 font-mono" title={contractId}>
                      {shortAddr(contractId)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                      Registro
                    </span>
                    <span className="text-[13px] text-slate-900 font-mono">
                      On-chain (Soroban)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                      Capacidad equivalente (ilustrativa)
                    </span>
                    <span className="text-[13px] text-emerald-600 font-mono font-bold">
                      {capacityWp != null ? `${capacityWp.toFixed(1)} Wp` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                      Monto pagado
                    </span>
                    <span className="text-[13px] text-slate-900 font-semibold">
                      {costXlm.toLocaleString("en-US")} XLM
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                      Cuenta participante
                    </span>
                    <span className="text-[13px] text-slate-900 font-mono">
                      {shortAddr(walletAddress)} (Freighter)
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 uppercase font-semibold">
                      Tipo de registro
                    </span>
                    <span className="text-[13px] text-slate-900 font-mono">
                      Balance en el contrato (no transferible)
                    </span>
                  </div>
                </div>

                {/* Bottom seal */}
                <div className="pt-5 mt-2 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shadow-inner shrink-0">
                      <span className="material-symbols-outlined text-amber-700 text-2xl">
                        policy
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] text-amber-800 font-bold leading-tight">
                        DEMO TESTNET
                      </span>
                      <span className="text-[12px] text-slate-500">
                        Sin valor legal ni financiero
                      </span>
                    </div>
                  </div>
                  {/* QR placeholder */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 bg-white p-1 rounded shadow-inner flex items-center justify-center border border-slate-200">
                      <svg
                        className="w-full h-full text-slate-800"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h2v4h-2v-4zm2 2h2v2h-2v-2zm-6-2h2v4h-2v-4zm-8-6h2v2H6v-2zm2 2h2v2H8v-2zm-2 2h2v2H6v-2zm12-4h2v2h-2v-2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Validar On-Chain
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Assets received + metrics (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Token deposit card */}
              <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] text-emerald-700 uppercase font-bold tracking-wider">
                    Registro en el contrato
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                    Confirmada on-chain
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-[32px] font-extrabold text-slate-900">
                    {tokenCount}
                  </span>
                  <span className="font-display text-[16px] font-bold text-emerald-600">
                    {assetId} · participaciones
                  </span>
                </div>
                <p className="text-[13px] text-slate-500 mb-4">
                  Pagaste {costXlm.toLocaleString("en-US")} XLM al contrato
                  Soroban del proyecto.
                </p>
                {capacityWp != null && (
                  <div className="p-3 bg-white rounded-lg flex items-center gap-3 border border-slate-100">
                    <span className="material-symbols-outlined text-orange-600 text-2xl">
                      bolt
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500 uppercase">
                        Capacidad equivalente (ilustrativa)
                      </span>
                      <span className="text-[14px] text-slate-900 font-bold font-mono">
                        {capacityWp.toFixed(1)} Wp
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Next revenue distribution card */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                <h4 className="text-[15px] font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-xl">
                    schedule
                  </span>
                  Cuándo hay ingresos
                </h4>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 mb-3 border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[12px] text-slate-500">
                      Depósito del emisor:
                    </span>
                    <span className="text-[14px] text-slate-900 font-semibold">
                      deposit_revenue
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[14px] text-orange-600 font-mono font-bold">
                      claim_revenue
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Reclamo desde el Dashboard
                    </span>
                  </div>
                </div>

                {/* CO₂ metric (illustrative: only for a project with a descriptive sheet) */}
                {capacityWp != null && (
                  <div className="flex items-start gap-3 pt-2">
                    <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0 mt-0.5">
                      eco
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-slate-900 font-semibold">
                        ~{co2Kg.toLocaleString("en-US")} kg CO₂e / año (estimación)
                      </span>
                      <p className="text-[12px] text-slate-500">
                        Estimación ilustrativa de la demo; no se emiten
                        certificados de energía renovable.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Non-custodial notice */}
              <div className="bg-slate-100/40 p-4 rounded-xl flex items-center gap-2 text-slate-500 border border-slate-200/60">
                <span className="material-symbols-outlined text-base text-slate-400">
                  verified_user
                </span>
                <span className="text-[12px]">
                  Sin custodia: tus llaves quedan en Freighter.
                </span>
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
            {/* Social sharing */}
            <div className="flex items-center gap-3 order-3 sm:order-1">
              <span className="text-[12px] text-slate-500">
                Compartir impacto:
              </span>
              <button className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                </svg>
              </button>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
              <PdfCertificate
                data={{
                  projectName,
                  location: "Red Stellar Soroban",
                  capacity: capacityWp != null ? `${capacityWp.toFixed(1)} Wp (ilustrativo)` : "—",
                  tokenAmount: String(tokenCount),
                  pricePaid: `${costXlm} XLM`,
                  walletAddress,
                  txHash,
                  flag: projectFlag,
                }}
              />
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto px-8 py-3 rounded-lg bg-emerald-600 text-white text-[14px] font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Ir a Mi Portafolio</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="mt-8 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-400 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500 text-base">
                gavel
              </span>
              <span>
                Demo en Stellar testnet con activos y datos simulados. Sin fondos reales. No es una oferta de inversión ni promete retornos.
              </span>
            </div>
            <span>Reparto proporcional on-chain vía claim_revenue.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
