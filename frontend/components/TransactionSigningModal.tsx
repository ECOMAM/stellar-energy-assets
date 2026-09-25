"use client";

import { useEffect, useRef } from "react";
import { TX_EXPLORER } from "@/lib/contract";

/* ──────────────────── Types ──────────────────── */

interface SigningModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Current signing phase: idle | preparing | signing | submitting | success | error */
  phase:
    | "idle"
    | "preparing"
    | "signing"
    | "submitting"
    | "success"
    | "error"
    | "rejected"
    | "insufficient_balance"
    | "wallet_missing";
  /** Error message when phase is error */
  errorMessage?: string;
  /** Hash of a sent but failed or unconfirmed transaction, linked in the error box */
  txHash?: string;
  /* ── Purchase data ── */
  projectName: string;
  projectFlag: string;
  assetId: string;
  tokenCount: number;
  costXlm: number;
  /** illustrative capacity; null for a project without a descriptive sheet */
  capacityWp: number | null;
  /* ── Wallet data ── */
  walletAddress: string;
  walletBalance: string;
  contractId: string;
}

/* ──────────────────── Helpers ──────────────────── */

function shortAddr(a: string) {
  if (!a) return "—";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function shortContract(a: string) {
  if (!a) return "—";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

/* ──────────────────── Phase config ──────────────────── */

const PHASE_CONFIG = {
  idle: {
    icon: "key",
    label: "Firmar con Freighter",
    sublabel: "",
    btnClass:
      "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25",
    showSpinner: false,
  },
  preparing: {
    icon: "sync",
    label: "Preparando transacción...",
    sublabel: "Construyendo llamada Soroban",
    btnClass: "bg-emerald-600 opacity-70 cursor-not-allowed text-white",
    showSpinner: true,
  },
  signing: {
    icon: "key",
    label: "Esperando firma en Freighter...",
    sublabel: "No cierres esta ventana",
    btnClass: "bg-emerald-600 opacity-70 cursor-not-allowed text-white",
    showSpinner: true,
  },
  submitting: {
    icon: "sync",
    label: "Enviando a Stellar...",
    sublabel: "Esperando la confirmación de la red",
    btnClass: "bg-emerald-600 opacity-70 cursor-not-allowed text-white",
    showSpinner: true,
  },
  success: {
    icon: "check_circle",
    label: "¡Transacción Confirmada!",
    sublabel: "Participación registrada en el contrato",
    btnClass: "bg-emerald-700 text-white",
    showSpinner: false,
  },
  error: {
    icon: "error",
    label: "Error en la Transacción",
    sublabel: "",
    btnClass: "bg-red-600 hover:bg-red-700 text-white",
    showSpinner: false,
  },
  rejected: {
    icon: "cancel",
    label: "Firma Rechazada",
    sublabel: "Cancelaste la transacción en Freighter",
    btnClass: "bg-slate-500 hover:bg-slate-600 text-white",
    showSpinner: false,
  },
  insufficient_balance: {
    icon: "account_balance_wallet",
    label: "Saldo Insuficiente",
    sublabel: "",
    btnClass: "bg-red-600 hover:bg-red-700 text-white",
    showSpinner: false,
  },
  wallet_missing: {
    icon: "extension",
    label: "Freighter No Detectado",
    sublabel: "Instala la extensión para continuar",
    btnClass: "bg-orange-600 hover:bg-orange-700 text-white",
    showSpinner: false,
  },
} as const;

/* ──────────────────── Component ──────────────────── */

export default function TransactionSigningModal({
  open,
  onClose,
  onConfirm,
  phase,
  errorMessage,
  txHash,
  projectName,
  projectFlag,
  assetId,
  tokenCount,
  costXlm,
  capacityWp,
  walletAddress,
  walletBalance,
  contractId,
}: SigningModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;
  const isTerminal = [
    "success",
    "error",
    "rejected",
    "insufficient_balance",
    "wallet_missing",
  ].includes(phase);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isTerminal) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, isTerminal, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/45 backdrop-blur-md transition-all duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && isTerminal) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-emerald-500/20 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* ── Top accent line ── */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-teal-500" />

        {/* ── Header ── */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            {/* Freighter shield avatar */}
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20 text-white p-2">
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[16px] font-bold tracking-tight text-slate-900">
                  Confirmar Transacción en Freighter
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Extensión Activa
                </span>
              </div>
              <p className="font-mono text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-[14px] text-amber-600">
                  code_blocks
                </span>
                Soroban Invocation:
                <span className="font-bold text-emerald-700 px-1.5 py-0.2 bg-emerald-50 rounded">
                  purchase_tokens
                </span>
              </p>
            </div>
          </div>
          {isTerminal && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cerrar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. Purchase summary */}
          <div className="rounded-xl p-5 bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{projectFlag}</span>
                <span className="font-display text-[15px] font-bold text-slate-900">
                  {projectName}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-mono text-xs bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                {assetId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                  Participaciones Solicitadas
                </span>
                <span className="font-mono text-[16px] font-bold text-slate-900 block mt-0.5">
                  {tokenCount} {tokenCount === 1 ? "participación" : "participaciones"}
                </span>
                {capacityWp != null && (
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ~{capacityWp.toFixed(1)} Wp (ilustrativo)
                  </span>
                )}
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                  Débito Total de Fondos
                </span>
                <span className="font-mono text-[16px] font-bold text-orange-700 block mt-0.5">
                  {costXlm.toLocaleString("en-US")} XLM
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                  Precio por Participación
                </span>
                <span className="font-mono text-[16px] font-bold text-emerald-600 block mt-0.5">
                  {(costXlm / tokenCount).toFixed(2)} XLM
                </span>
                <span className="text-[11px] text-slate-500">
                  {tokenCount} {tokenCount === 1 ? "participación" : "participaciones"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Stellar network params table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2.5 font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Parámetros de Red Stellar Soroban</span>
              <span className="flex items-center gap-1 text-emerald-700 normal-case font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Stellar Testnet
              </span>
            </div>
            <div className="divide-y divide-slate-200 bg-white font-[13px]">
              {/* Wallet */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">
                    wallet
                  </span>
                  Wallet Firmante (Freighter)
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900">
                    {shortAddr(walletAddress)}
                  </span>
                  <span className="text-[11px] text-emerald-700 ml-1.5">
                    (Saldo: {walletBalance} XLM)
                  </span>
                </div>
              </div>
              {/* Contract */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">
                    verified
                  </span>
                  Contrato Inteligente Soroban
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-900 font-semibold">
                    {shortContract(contractId)}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                    v2.1 · testnet
                  </span>
                </div>
              </div>
              {/* Gas */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-600">
                    local_gas_station
                  </span>
                  Comisión de Red (Gas Fee)
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-800">
                    Centavos de XLM
                  </span>
                  <span className="text-[11px] text-slate-500 ml-1">
                    (Freighter muestra el monto exacto)
                  </span>
                </div>
              </div>
              {/* Speed */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">
                    speed
                  </span>
                  Tiempo de Confirmación
                </span>
                <span className="font-mono text-slate-900">
                  Unos segundos (cierre de ledger)
                </span>
              </div>
              {/* Legal safeguard */}
              <div className="px-4 py-2.5 flex items-start justify-between bg-emerald-50/40">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-emerald-700">
                    shield_lock
                  </span>
                  Qué registra el contrato
                </span>
                <span className="text-right font-[13px] text-emerald-900 font-medium max-w-[280px]">
                  Tu balance de participaciones en el proyecto (on-chain, no
                  transferible). Demo sin valor legal.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Security box */}
          <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-700 text-[22px] mt-0.5">
              lock
            </span>
            <div className="space-y-0.5">
              <h4 className="font-display text-[13px] text-emerald-950 font-bold uppercase tracking-wide">
                Qué hace esta firma
              </h4>
              <p className="text-[13px] text-emerald-800 leading-relaxed">
                purchase_tokens transfiere {costXlm.toLocaleString("en-US")} XLM
                de tu cuenta al contrato Soroban en una sola operación atómica y
                registra tus participaciones. Los XLM quedan en el contrato hasta
                que el emisor retire ventas; tus ingresos se reclaman con
                claim_revenue.
              </p>
            </div>
          </div>

          {/* 4. Error / rejection / balance warnings */}
          {phase === "error" && errorMessage && (
            <div className="rounded-xl p-4 bg-red-50 border border-red-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[22px] mt-0.5">
                error
              </span>
              <div>
                <h4 className="font-display text-[13px] text-red-900 font-bold uppercase tracking-wide">
                  Error Detectado
                </h4>
                <p className="text-[13px] text-red-700 leading-relaxed mt-0.5 font-mono">
                  {errorMessage}
                </p>
                {txHash && (
                  <a
                    href={TX_EXPLORER(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-red-800 underline"
                  >
                    Ver la transacción en StellarExpert
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {phase === "rejected" && (
            <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[22px] mt-0.5">
                cancel
              </span>
              <div>
                <h4 className="font-display text-[13px] text-amber-900 font-bold uppercase tracking-wide">
                  Firma Cancelada
                </h4>
                <p className="text-[13px] text-amber-800 leading-relaxed">
                  Cerraste la ventana de Freighter sin firmar. Tu participación no
                  fue procesada. Puedes intentar nuevamente cuando estés listo.
                </p>
              </div>
            </div>
          )}

          {phase === "insufficient_balance" && (
            <div className="rounded-xl p-4 bg-red-50 border border-red-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[22px] mt-0.5">
                account_balance_wallet
              </span>
              <div>
                <h4 className="font-display text-[13px] text-red-900 font-bold uppercase tracking-wide">
                  Saldo Insuficiente
                </h4>
                <p className="text-[13px] text-red-700 leading-relaxed">
                  Tu wallet {shortAddr(walletAddress)} tiene {walletBalance} XLM
                  pero necesitas {costXlm.toLocaleString("en-US")} XLM disponibles
                  más un margen para comisiones y la reserva mínima de la cuenta.
                  Recarga tu wallet de testnet (Friendbot) e intenta de nuevo.
                </p>
              </div>
            </div>
          )}

          {phase === "wallet_missing" && (
            <div className="rounded-xl p-4 bg-orange-50 border border-orange-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-orange-600 text-[22px] mt-0.5">
                extension
              </span>
              <div>
                <h4 className="font-display text-[13px] text-orange-900 font-bold uppercase tracking-wide">
                  Freighter No Detectado
                </h4>
                <p className="text-[13px] text-orange-800 leading-relaxed">
                  Instala la extensión Freighter desde{" "}
                  <a
                    href="https://freighter.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    freighter.app
                  </a>{" "}
                  y recarga la página para continuar.
                </p>
              </div>
            </div>
          )}

          {/* 5. Action buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {isTerminal ? (
                <>
                  <button
                    onClick={onClose}
                    className={`w-full sm:flex-1 py-4 px-6 rounded-xl font-display text-[14px] font-bold transition-all flex items-center justify-center gap-2 ${cfg.btnClass}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {cfg.icon}
                    </span>
                    {phase === "success"
                      ? "Cerrar"
                      : phase === "wallet_missing"
                        ? "Instalar Freighter"
                        : "Entendido"}
                  </button>
                  {phase === "wallet_missing" && (
                    <a
                      href="https://freighter.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-4 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display text-[14px] font-medium border border-slate-200 transition-colors text-center"
                    >
                      Abrir freighter.app
                    </a>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={onConfirm}
                    disabled={phase !== "idle"}
                    className={`w-full sm:flex-1 py-4 px-6 rounded-xl font-display text-[14px] font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${cfg.btnClass}`}
                  >
                    {cfg.showSpinner && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {!cfg.showSpinner && (
                      <span className="material-symbols-outlined text-[20px]">
                        {cfg.icon}
                      </span>
                    )}
                    <span>
                      {phase === "idle"
                        ? `Firmar con Freighter (${costXlm.toLocaleString("en-US")} XLM)`
                        : cfg.label}
                    </span>
                  </button>
                  <button
                    onClick={onClose}
                    disabled={phase !== "idle"}
                    className="w-full sm:w-auto py-4 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-display text-[14px] font-medium border border-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Rechazar
                  </button>
                </>
              )}
            </div>

            {/* Micro-copy */}
            <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">
                verified_user
              </span>
              Al firmar, se abrirá la ventana emergente de Freighter para
              autorizar con tu clave privada local. NIKO SUN nunca tiene
              custodia de tus llaves.
            </p>
          </div>
        </div>

        {/* ── Pending banner ── */}
        {(phase === "preparing" || phase === "signing" || phase === "submitting") && (
          <div className="p-4 bg-emerald-900 text-white flex items-center justify-center gap-3 animate-in slide-in-from-bottom duration-200">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs font-semibold">
              {phase === "preparing"
                ? "Construyendo transacción Soroban..."
                : phase === "signing"
                  ? "Esperando firma local en Freighter Extension... No cierres esta ventana."
                  : "Transacción en proceso de confirmación en Stellar..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
