"use client";

import { useEffect, useState } from "react";
import {
  CONTRACT_ID,
  EXPLORER_URL,
  HOLDER_EXPLORER,
  LEDGER_EXPLORER_URL,
  ONCHAIN_CYCLE_DOC_URL,
} from "@/lib/contract";
import { readContractNative } from "@/lib/soroban";
import {
  formatHolderCount,
  formatLastIndexed,
  formatRelativeTime,
  type HolderMetrics,
} from "@/lib/holderIndexer";

type Props = {
  metrics: HolderMetrics | null;
  nextProjectId?: number | null;
  totalMinted?: string | null;
};

function shortContract(id: string) {
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

export default function ProtocolVerification({
  metrics,
  nextProjectId,
  totalMinted,
}: Props) {
  const [nowTick, setNowTick] = useState(0);
  const [admin, setAdmin] = useState<string | null>(null);
  const [paused, setPaused] = useState<boolean | null>(null);

  // tick every 5s to refresh relative time
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // v2.1 admin and global pause, read-only (get_admin, is_paused).
  useEffect(() => {
    let cancelled = false;
    readContractNative<string>("get_admin")
      .then((a) => !cancelled && setAdmin(typeof a === "string" ? a : null))
      .catch(() => !cancelled && setAdmin(null));
    readContractNative<boolean>("is_paused")
      .then((p) => !cancelled && setPaused(typeof p === "boolean" ? p : null))
      .catch(() => !cancelled && setPaused(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const holderDisplay =
    metrics?.holderCount !== null && metrics?.holderCount !== undefined
      ? formatHolderCount(metrics.holderCount)
      : "—";
  const isIndexing =
    metrics === null || metrics.holderCount === null || metrics.status === "indexing";
  const lastIndexed = metrics?.lastIndexedAt
    ? formatLastIndexed(metrics.lastIndexedAt)
    : "—";
  const relative = metrics?.lastIndexedAt
    ? formatRelativeTime(metrics.lastIndexedAt)
    : "";

  // Keep hook alive for rerenders; suppress lint for unused var.
  void nowTick;

  return (
    <section className="w-full max-w-7xl mx-auto px-5 lg:px-10 mt-8">
      <div className="rounded-xl bg-white border border-slate-200 shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-display text-[13px] font-bold tracking-widest uppercase text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">
              verified_user
            </span>
            Protocol Status
          </h3>
          <span className="font-mono text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            Stellar Testnet · contrato v2.1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Left column */}
          <div className="divide-y divide-slate-100">
            <Row
              icon="contract"
              color="text-emerald-600"
              label="Soroban contract"
              value="Deployed (v2.1)"
              href={EXPLORER_URL}
              hrefLabel="View Contract →"
              title={CONTRACT_ID}
              sub={shortContract(CONTRACT_ID)}
            />
            <Row
              icon="admin_panel_settings"
              color="text-emerald-600"
              label="Admin"
              value={admin ? shortContract(admin) : "—"}
              href={admin ? HOLDER_EXPLORER(admin) : undefined}
              hrefLabel={admin ? "Account →" : undefined}
              title={admin ?? undefined}
            />
            <Row
              icon={paused ? "pause_circle" : "play_circle"}
              color={paused ? "text-amber-600" : "text-emerald-600"}
              label="Global pause (is_paused)"
              value={paused === null ? "—" : paused ? "Paused" : "Active"}
              ok={paused !== true}
              sub={paused ? "purchases & deposits blocked" : undefined}
            />
            <Row
              icon="database"
              color="text-emerald-600"
              label="Contract state"
              value="Indexed"
              sub={nextProjectId != null ? `(next_project_id: ${nextProjectId})` : undefined}
            />
            <Row
              icon="token"
              color="text-emerald-600"
              label="Participations minted"
              value="On-chain"
              sub={totalMinted != null ? `(total minted: ${totalMinted})` : undefined}
            />
            <Row
              icon="group"
              color="text-amber-600"
              label="Holder count"
              value={
                isIndexing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">—</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-mono animate-pulse inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                      Indexing...
                    </span>
                  </span>
                ) : (
                  <span className="font-mono font-bold text-slate-900">{holderDisplay}</span>
                )
              }
              sub={
                metrics?.isStale
                  ? "Stale · showing cached"
                  : metrics?.source ?? "Stellar Testnet"
              }
            />
          </div>

          {/* Right column — network & index time */}
          <div className="p-5 flex flex-col gap-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                Network
              </span>
              <span className="font-mono text-[12px] font-semibold text-slate-900 inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Stellar Testnet
              </span>
            </div>

            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                Contract ID
              </div>
              <div className="font-mono text-[11px] font-semibold text-slate-900 break-all">{CONTRACT_ID}</div>
            </div>

            <div className="rounded-lg bg-white border border-slate-200 p-4">
              <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                Last indexed
              </div>
              <div className="font-mono text-[13px] font-semibold text-slate-900">
                {lastIndexed}
                {relative ? (
                  <span className="ml-2 font-normal text-slate-500">· {relative}</span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={LEDGER_EXPLORER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                >
                  View Ledger
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
                <a
                  href={ONCHAIN_CYCLE_DOC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                >
                  Ciclo on-chain (evidencia)
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
                {metrics?.isStale && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-mono font-bold">
                    Stale
                  </span>
                )}
              </div>
            </div>

            <p className="font-mono text-[11px] leading-relaxed text-slate-500">
              Holder count: buyers found in the contract&apos;s <span className="font-semibold text-slate-700">purchase</span> events
              (RPC retention window, ~7 days) plus the approved demo participants, each confirmed
              on-chain with get_portfolio (balance &gt; 0) for{" "}
              <span className="font-semibold text-slate-700">{shortContract(CONTRACT_ID)}</span>. If
              nothing can be read, the panel shows an indexing state, never a fabricated number.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon,
  color,
  label,
  value,
  sub,
  href,
  hrefLabel,
  title,
  ok = true,
}: {
  icon: string;
  color: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  hrefLabel?: string;
  title?: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`material-symbols-outlined ${color} text-[18px] shrink-0`}>{icon}</span>
        <span className="font-mono text-[12px] font-medium text-slate-700 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[12px] font-semibold text-slate-900 inline-flex items-center gap-1" title={title}>
          <span className={`material-symbols-outlined ${ok ? "text-emerald-600" : "text-amber-600"} text-[14px]`}>
            {ok ? "check" : "warning"}
          </span>
          {value}
        </span>
        {sub && <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">{sub}</span>}
        {href && hrefLabel && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
            title={title}
          >
            {hrefLabel}
          </a>
        )}
      </div>
    </div>
  );
}
