"use client";

import { useEffect, useState } from "react";
import { CONTRACT_ID, EXPLORER_URL, LEDGER_EXPLORER_URL } from "@/lib/contract";
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

  // tick every 5s to refresh relative time
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 5000);
    return () => clearInterval(id);
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
            Stellar Testnet
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Left column */}
          <div className="divide-y divide-slate-100">
            <Row
              icon="contract"
              color="text-emerald-600"
              label="Soroban contract"
              value="Verified"
              href={EXPLORER_URL}
              hrefLabel="View Contract →"
              title={CONTRACT_ID}
              sub={shortContract(CONTRACT_ID)}
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
              label="Token balances"
              value="Indexed"
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
            <Row
              icon="payments"
              color="text-emerald-600"
              label="Claimable balances"
              value="On-chain"
            />
            <Row
              icon="solar_power"
              color="text-emerald-600"
              label="Project state"
              value="On-chain"
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
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={LEDGER_EXPLORER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                >
                  View Ledger
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
              Holder count is indexed from Soroban RPC events for{" "}
              <span className="font-semibold text-slate-700">{shortContract(CONTRACT_ID)}</span>. If the
              contract does not emit purchase events yet, the indexer falls back to known
              holder probes and shows an honest indexing state — never a fabricated number.
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
}: {
  icon: string;
  color: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  hrefLabel?: string;
  title?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`material-symbols-outlined ${color} text-[18px] shrink-0`}>{icon}</span>
        <span className="font-mono text-[12px] font-medium text-slate-700 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[12px] font-semibold text-slate-900 inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-emerald-600 text-[14px]">check</span>
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
