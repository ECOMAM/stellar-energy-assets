"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useWallet, type SignAndSend } from "@/lib/WalletContext";
import { CONTRACT_ID, TX_EXPLORER } from "@/lib/contract";
import { describeTxError, PARTICIPANT_NOT_APPROVED_MESSAGE, txHashOf } from "@/lib/contractErrors";
import { getProjectMeta, META_PROJECT_IDS } from "@/lib/projectMeta";
import { soldPercent, type OnChainProject } from "@/lib/projects";
import { readContractNative } from "@/lib/soroban";
import { formatXlm, toBigIntOr, xlmToStroops } from "@/lib/units";
import PdfCertificate from "@/components/PdfCertificate";
import ProtocolVerification from "@/components/ProtocolVerification";
import { useHolderMetrics } from "@/hooks/useHolderMetrics";
import { useOnChainProjects } from "@/hooks/useOnChainProjects";
import { useComplianceStatus, type ComplianceStatus } from "@/hooks/useComplianceStatus";

/* ── Constants ── */
type View = "dashboard" | "projects" | "claim" | "metrics" | "admin";

type Tone = "lime" | "orange" | "amber";
const TONES: Record<number, Tone> = { 1: "orange", 2: "lime", 3: "amber" };

/** One project as the dashboard shows it: on-chain numbers + off-chain demo metadata. */
type DisplayProject = {
  id: number;
  name: string;
  location: string;
  capacity: string;
  creator: string | null;
  totalSupply: bigint;
  minted: bigint;
  price: bigint; // stroops per participation
  energyKwh: bigint;
  totalRevenue: bigint; // stroops
  active: boolean;
  progress: number;
  tone: Tone;
  /** true = fallback metadata (chain unreachable), always labelled DEMO */
  isDemo: boolean;
};

function fromChain(p: OnChainProject): DisplayProject {
  const meta = getProjectMeta(p.id);
  return {
    id: p.id,
    name: p.name || meta.fallback.name,
    location: meta.location,
    capacity: meta.capacity,
    creator: p.creator,
    totalSupply: p.totalSupply,
    minted: p.minted,
    price: p.price,
    energyKwh: p.totalEnergyKwh,
    totalRevenue: p.totalRevenue,
    active: p.active,
    progress: soldPercent(p),
    tone: TONES[p.id] ?? "lime",
    isDemo: false,
  };
}

function demoProjects(): DisplayProject[] {
  return META_PROJECT_IDS.map((id) => {
    const meta = getProjectMeta(id);
    const f = meta.fallback;
    return {
      id,
      name: f.name,
      location: meta.location,
      capacity: meta.capacity,
      creator: null,
      totalSupply: f.totalSupply,
      minted: f.minted,
      price: f.price,
      energyKwh: BigInt(0),
      totalRevenue: BigInt(0),
      active: true,
      progress: soldPercent(f),
      tone: TONES[id] ?? "lime",
      isDemo: true,
    };
  });
}

/** On-chain projects, or the labelled DEMO fallback while loading / if the RPC fails. */
function useDisplayProjects() {
  const { projects, loading, reload } = useOnChainProjects();
  const display = useMemo(() => (projects ? projects.map(fromChain) : demoProjects()), [projects]);
  return { projects: display, onChain: projects, loading, reload };
}

type Position = { balance: bigint; claimable: bigint; claimed: bigint };

const ZERO = BigInt(0);

/** get_portfolio(address, ids) -> Map<projectId, Position>. null while unknown. */
function usePortfolio(address: string | null | undefined, ids: number[]) {
  const [positions, setPositions] = useState<Map<number, Position> | null>(null);
  const [loading, setLoading] = useState(false);
  const key = ids.join(",");

  const reload = useCallback(async () => {
    const list = key ? key.split(",").map(Number) : [];
    if (!address || list.length === 0) {
      setPositions(null);
      return;
    }
    setLoading(true);
    try {
      const raw = await readContractNative<Array<Record<string, unknown>>>("get_portfolio", [address, list]);
      const map = new Map<number, Position>();
      for (const p of Array.isArray(raw) ? raw : []) {
        map.set(Number(toBigIntOr(p.project_id, ZERO)), {
          balance: toBigIntOr(p.token_balance, ZERO),
          claimable: toBigIntOr(p.claimable_amount, ZERO),
          claimed: toBigIntOr(p.total_claimed, ZERO),
        });
      }
      setPositions(map);
    } catch (e) {
      console.warn("get_portfolio failed", e);
      setPositions(null);
    } finally {
      setLoading(false);
    }
  }, [address, key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { positions, loading, reload };
}

const nav = [
  { id: "dashboard" as const, label: "Dashboard", icon: "home" },
  { id: "projects" as const, label: "Mis proyectos", icon: "battery_charging_full" },
  { id: "claim" as const, label: "Reclamar ingresos", icon: "payments" },
  { id: "metrics" as const, label: "Métricas", icon: "bar_chart" },
  { id: "admin" as const, label: "Admin", icon: "settings" },
];

/* ── Components ── */

function Logo() {
  return (
    <a href="/" className="flex items-center gap-3.5 group">
      <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50 border border-emerald-200 shadow-sm group-hover:border-emerald-500 transition-all p-1">
        <span className="material-symbols-outlined text-emerald-600 text-[22px]">
          solar_power
        </span>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xl tracking-tight font-extrabold text-slate-900 font-display">
            NIKO
            <span className="text-amber-600">SUN</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
            RWA SOLAR
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-700 font-semibold tracking-wide">
          Powered by Stellar Soroban
        </span>
      </div>
    </a>
  );
}

function MiniChart({ orange = false }: { orange?: boolean }) {
  return (
    <svg
      viewBox="0 0 180 56"
      className="h-14 w-full"
      preserveAspectRatio="none"
      aria-label="Gráfico ilustrativo (demo)"
    >
      <path
        d="M0 47 C20 46 18 33 38 36 S52 43 69 29 S86 33 101 20 S119 28 133 13 S154 20 180 4"
        fill="none"
        stroke={orange ? "#ea580c" : "#059669"}
        strokeWidth="2.5"
      />
      <path
        d="M0 47 C20 46 18 33 38 36 S52 43 69 29 S86 33 101 20 S119 28 133 13 S154 20 180 4 V56 H0Z"
        fill={orange ? "url(#orange)" : "url(#green)"}
        opacity=".14"
      />
      <defs>
        <linearGradient id="green" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#059669" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="orange" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#ea580c" />
          <stop offset="1" stopColor="#ea580c" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-mono font-bold",
        className
      )}
    >
      DEMO
    </span>
  );
}

function Notice({ tone, children }: { tone: "error" | "success" | "info" | "warn"; children: React.ReactNode }) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-slate-50 border-slate-200 text-slate-700",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
  }[tone];
  const icon = { error: "error", success: "check_circle", info: "info", warn: "warning" }[tone];
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed", styles)}>
      <span className="material-symbols-outlined text-[16px] shrink-0">{icon}</span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={TX_EXPLORER(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono font-semibold underline"
    >
      {hash.slice(0, 10)}…
    </a>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  action,
  onAction,
  actionDisabled,
  demo,
}: {
  icon: string;
  label: string;
  value: string;
  change?: string;
  action?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  demo?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md relative overflow-hidden p-5">
      {demo && (
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
          DEMO
        </span>
      )}
      <div className="mb-5 flex items-center justify-between">
        <div className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        {change && (
          <span className="text-xs font-medium text-emerald-600">{change}</span>
        )}
        {action && (
          <button
            onClick={onAction}
            disabled={actionDisabled}
            className="h-7 bg-orange-600 hover:bg-orange-700 px-2.5 rounded-lg text-xs text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action}
          </button>
        )}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

function Sidebar({
  view,
  setView,
  address,
  balance,
  connected,
  connect,
}: {
  view: View;
  setView: (view: View) => void;
  address: string | null;
  balance: string;
  connected: boolean;
  connect: () => Promise<void>;
}) {
  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 max-lg:w-[76px] max-lg:items-center max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:h-[70px] max-md:w-full max-md:flex-row max-md:justify-around max-md:border-t max-md:border-r-0 max-md:px-2 max-md:py-2">
      <div className="mb-10 max-lg:mb-0 max-lg:hidden">
        <Logo />
      </div>
      <div className="mb-10 hidden max-lg:block">
        <a href="/" className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50 border border-emerald-200">
          <span className="material-symbols-outlined text-emerald-600 text-[22px]">solar_power</span>
        </a>
      </div>
      <nav className="flex w-full flex-col gap-1 max-md:flex-row max-md:justify-around">
        {nav.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 max-lg:justify-center max-lg:px-2 max-md:flex-col max-md:gap-1 max-md:py-1 max-md:text-[10px]",
              view === id &&
                "bg-emerald-50 font-medium text-emerald-700 border border-emerald-200"
            )}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            <span className="max-lg:hidden max-md:block">{label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto w-full max-lg:hidden">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-full bg-orange-100 text-orange-600">
              <span className="material-symbols-outlined text-[16px]">
                account_balance_wallet
              </span>
            </div>
            <div>
              <div className="font-mono text-[11px] text-slate-700">
                {connected && address
                  ? `${address.slice(0, 4)}...${address.slice(-4)}`
                  : "Sin conectar"}
              </div>
              <div className="text-[10px] text-slate-500">
                {connected ? `${balance} XLM` : "—"}
              </div>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-1.5 text-[10px] text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Stellar
            Testnet
          </div>
          {!connected && (
            <button
              onClick={() => connect().catch((e) => console.warn("Freighter connect failed", e))}
              className="h-7 w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
            >
              Conectar wallet
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function ProjectCard({
  project,
  onSelect,
  isLoading,
}: {
  project: DisplayProject;
  onSelect: () => void;
  isLoading?: boolean;
}) {
  const isDemo = project.isDemo && !isLoading;
  return (
    <button
      onClick={onSelect}
      className="bg-white border border-slate-200 rounded-xl shadow-md group text-left transition hover:-translate-y-0.5 hover:border-emerald-300 w-full relative"
      style={isLoading ? { opacity: 0.7 } : undefined}
    >
      {isDemo && (
        <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
          DEMO
        </span>
      )}
      <div
        className={cn(
          "h-1 rounded-t-xl",
          project.tone === "orange"
            ? "bg-orange-500"
            : project.tone === "amber"
              ? "bg-amber-400"
              : "bg-emerald-500"
        )}
      />
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
              {project.name}
              <span className="material-symbols-outlined text-[12px] text-slate-400 transition group-hover:text-emerald-600">
                arrow_upward
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {project.location} · id {project.id}
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-1 text-[10px] font-medium border",
              project.active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            )}
          >
            {project.active ? "Activo" : "Inactivo"}
          </span>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-slate-500">Capacidad (demo)</div>
            <div className="mt-1 font-mono text-sm text-slate-700">
              {project.capacity}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Energía reportada</div>
            <div className="mt-1 font-mono text-sm text-emerald-600" title="kWh reportados por el emisor y anclados on-chain (update_energy / deposit_revenue)">
              {isDemo ? "—" : `${project.energyKwh.toLocaleString("en-US")} kWh`}
            </div>
          </div>
        </div>
        <MiniChart orange={project.tone === "orange"} />
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">Participaciones vendidas</span>
          <span className="font-mono text-slate-600" title={isDemo ? "Valor demo: sin conexión a testnet" : "On-chain: minted / total_supply"}>
            {isLoading ? "…" : `${project.minted.toString()} / ${project.totalSupply.toString()} (${project.progress}%)`}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full",
              project.tone === "orange" ? "bg-orange-500" : "bg-emerald-500"
            )}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-sm text-slate-900" title={isDemo ? "Precio demo" : `Precio on-chain: ${project.price.toString()} stroops`}>
            {formatXlm(project.price)} XLM{" "}
            <span className="font-sans text-xs text-slate-500">/ participación</span>
          </span>
          <span className="text-xs text-emerald-600">
            Ver detalle{" "}
            <span className="material-symbols-outlined ml-1 inline text-[12px]">
              chevron_right
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

function ParticipantStatus({ connected, compliance }: { connected: boolean; compliance: ComplianceStatus }) {
  if (!connected) {
    return <Notice tone="info">Conecta tu wallet para ver si tu cuenta está aprobada como participante.</Notice>;
  }
  return (
    <div className="flex flex-col gap-2">
      {compliance.paused === true && (
        <Notice tone="warn">
          El contrato está en pausa: las compras y los depósitos de ingresos están bloqueados. Los reclamos siguen disponibles.
        </Notice>
      )}
      {compliance.isParticipant === true && (
        <Notice tone="success">
          Cuenta aprobada como participante (KYC simulado para esta demo, <span className="font-mono">is_participant = true</span>).
        </Notice>
      )}
      {compliance.isParticipant === false && <Notice tone="warn">{PARTICIPANT_NOT_APPROVED_MESSAGE}</Notice>}
      {compliance.isParticipant === null && !compliance.loading && (
        <Notice tone="info">No se pudo leer el estado de participante desde testnet.</Notice>
      )}
    </div>
  );
}

type ClaimOutcome = {
  /** claims that reached SUCCESS on-chain */
  hashes: string[];
  /** XLM paid by those claims (claim_revenue's return value); null if an amount is unknown */
  claimed: bigint | null;
  /** first failure; `hash` is set when that transaction was sent */
  error: { text: string; hash?: string } | null;
};

/** Sequentially claim every project with claimable > 0 (one Freighter signature each). */
async function claimProjects(signAndSend: SignAndSend, address: string, ids: number[]): Promise<ClaimOutcome> {
  const sdk = await import("@stellar/stellar-sdk");
  const hashes: string[] = [];
  let claimed: bigint | null = ZERO;
  for (const id of ids) {
    try {
      // contract: claim_revenue(address: Address, project_id: u64) -> u128.
      // signAndSend resolves only once the claim reached SUCCESS.
      const { txHash, returnValue } = await signAndSend(CONTRACT_ID, "claim_revenue", [address, id]);
      hashes.push(txHash);
      let amount: bigint | null = null;
      try {
        amount = returnValue ? toBigIntOr(sdk.scValToNative(returnValue), null) : null;
      } catch {
        // amount unknown; the tx link is still shown
      }
      claimed = claimed !== null && amount !== null ? claimed + amount : null;
    } catch (e) {
      return { hashes, claimed, error: { text: describeTxError(e), hash: txHashOf(e) } };
    }
  }
  return { hashes, claimed, error: null };
}

function claimedText(claimed: bigint | null): string {
  return claimed !== null ? `${formatXlm(claimed)} XLM` : "monto no informado (ver la transacción)";
}

/* ── View Sections ── */

function DashboardView({
  setView,
  signAndSend,
  connected,
  address,
}: {
  setView: (v: View) => void;
  signAndSend: SignAndSend;
  connected: boolean;
  address?: string | null;
}) {
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ tone: "error" | "success"; text: string; hashes: string[] } | null>(null);
  const { metrics: holderMetrics } = useHolderMetrics();
  const { projects, onChain, loading: isChainLoading } = useDisplayProjects();
  const ids = useMemo(() => (onChain ?? []).map((p) => p.id), [onChain]);
  const { positions, loading: isPortfolioLoading, reload: reloadPortfolio } = usePortfolio(
    connected ? address : null,
    ids
  );
  const compliance = useComplianceStatus(connected ? address : null);

  const isReal = connected && !!onChain && !!positions;
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  let tokens = BigInt(0);
  let contributed = BigInt(0);
  let claimable = BigInt(0);
  const claimableIds: number[] = [];
  positions?.forEach((pos, id) => {
    tokens += pos.balance;
    contributed += pos.balance * (byId.get(id)?.price ?? BigInt(0));
    claimable += pos.claimable;
    if (pos.claimable > BigInt(0)) claimableIds.push(id);
  });
  const heldIn = positions ? Array.from(positions.values()).filter((p) => p.balance > BigInt(0)).length : 0;

  const handleClaimAll = async () => {
    if (!connected || !address || claimableIds.length === 0) return;
    setClaiming(true);
    setClaimMsg(null);
    const r = await claimProjects(signAndSend, address, claimableIds);
    setClaimMsg(
      r.error
        ? {
            tone: "error",
            text:
              r.hashes.length > 0
                ? `${r.error.text} Reclamos confirmados antes del error: ${claimedText(r.claimed)}.`
                : r.error.text,
            hashes: r.error.hash ? [...r.hashes, r.error.hash] : r.hashes,
          }
        : {
            tone: "success",
            text:
              r.claimed !== null
                ? `Reclamaste ${formatXlm(r.claimed)} XLM.`
                : "Reclamo confirmado on-chain; el monto no se pudo leer, revisa la transacción.",
            hashes: r.hashes,
          }
    );
    await reloadPortfolio();
    setClaiming(false);
  };

  const totalMinted = onChain ? onChain.reduce((acc, p) => acc + p.minted, BigInt(0)) : null;
  const nextProjectId = onChain ? (onChain.length > 0 ? Math.max(...onChain.map((p) => p.id)) + 1 : 1) : null;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[.18em] text-emerald-600">
            Resumen de participación
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
            Buenos días, participante
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tus participaciones en proyectos solares demo registrados en Stellar testnet.
          </p>
        </div>
        <button
          onClick={() => setView("projects")}
          className="hidden bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors sm:flex items-center gap-2"
        >
          Explorar proyectos
          <span className="material-symbols-outlined text-[16px]">
            arrow_upward
          </span>
        </button>
      </div>

      <ParticipantStatus connected={connected} compliance={compliance} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon="payments"
          label="Mi participación (XLM aportados)"
          value={isReal ? `${formatXlm(contributed)} XLM` : "—"}
        />
        <StatCard
          icon="bolt"
          label="Ingresos pendientes"
          value={isPortfolioLoading ? "…" : isReal ? `${formatXlm(claimable)} XLM` : "—"}
          action={claiming ? "Reclamando…" : "Reclamar todo"}
          onAction={handleClaimAll}
          actionDisabled={!isReal || claiming || claimableIds.length === 0}
        />
        <StatCard
          icon="eco"
          label="Participaciones en posesión"
          value={isReal ? tokens.toString() : "—"}
          change={isReal ? `En ${heldIn} proyecto${heldIn === 1 ? "" : "s"}` : undefined}
        />
      </div>
      {claimMsg && (
        <Notice tone={claimMsg.tone}>
          {claimMsg.text}{" "}
          {claimMsg.hashes.map((h) => (
            <span key={h} className="mr-2">
              <TxLink hash={h} />
            </span>
          ))}
        </Notice>
      )}

      <ProtocolVerification
        metrics={holderMetrics}
        nextProjectId={nextProjectId}
        totalMinted={totalMinted != null ? totalMinted.toString() : null}
      />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 font-display">
              Proyectos destacados
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Nombre y cifras leídos del contrato; ubicación y capacidad son datos demo
            </p>
          </div>
          <button
            onClick={() => setView("projects")}
            className="text-xs text-emerald-600 hover:text-emerald-700"
          >
            Ver todos{" "}
            <span className="material-symbols-outlined inline text-[12px]">
              chevron_right
            </span>
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {projects.slice(0, 3).map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={() => setView("projects")}
              isLoading={isChainLoading}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* My Projects Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 font-display">
                Mis proyectos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {isReal ? "Posiciones on-chain (get_portfolio)" : "Conecta tu wallet para ver tus posiciones reales"}
              </p>
            </div>
            {!isReal && <DemoBadge />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Proyecto</th>
                  <th className="pb-3 font-medium">Participaciones</th>
                  <th className="pb-3 font-medium">Aportado</th>
                  <th className="pb-3 font-medium">Ingresos por reclamar</th>
                  <th className="pb-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const pos = positions?.get(p.id);
                  return (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-4 font-medium text-slate-700">{p.name}</td>
                      <td className="py-4 font-mono text-slate-600">
                        {isReal ? (pos?.balance ?? BigInt(0)).toString() : "—"}
                      </td>
                      <td className="py-4 font-mono text-slate-600">
                        {isReal ? `${formatXlm((pos?.balance ?? BigInt(0)) * p.price)} XLM` : "—"}
                      </td>
                      <td className="py-4 font-mono text-emerald-600">
                        {isReal ? `${formatXlm(pos?.claimable ?? BigInt(0))} XLM` : "—"}
                      </td>
                      <td className="py-4">
                        <span className={cn("flex items-center gap-1", p.active ? "text-emerald-600" : "text-slate-500")}>
                          <span className="material-symbols-outlined text-[14px]">
                            {p.active ? "check" : "pause"}
                          </span>{" "}
                          {p.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity (illustrative) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 font-display">
              Actividad reciente
            </h2>
            <DemoBadge />
          </div>
          <div className="flex flex-col gap-5 text-xs">
            <div className="flex gap-3">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <span className="material-symbols-outlined text-[14px]">
                  bolt
                </span>
              </div>
              <div>
                <p className="leading-5 text-slate-600">
                  Ejemplo: reclamaste <b className="text-emerald-700">2.1 XLM</b> de un proyecto
                </p>
                <span className="text-slate-400">Ilustrativo</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-600">
                <span className="material-symbols-outlined text-[14px]">
                  account_balance_wallet
                </span>
              </div>
              <div>
                <p className="leading-5 text-slate-600">
                  Ejemplo: compraste <b className="text-slate-900">5 participaciones</b>
                </p>
                <span className="text-slate-400">Ilustrativo</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600">
                <span className="material-symbols-outlined text-[14px]">
                  wb_sunny
                </span>
              </div>
              <div>
                <p className="leading-5 text-slate-600">
                  Ejemplo: el emisor reportó{" "}
                  <b className="text-slate-900">1,200 kWh</b> con update_energy
                </p>
                <span className="text-slate-400">Ilustrativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimView({
  signAndSend,
  connected,
  address,
}: {
  signAndSend: SignAndSend;
  connected: boolean;
  address?: string | null;
}) {
  const [claiming, setClaiming] = useState(false);
  const [last, setLast] = useState<{ hashes: string[]; claimed: bigint | null; projectName: string } | null>(null);
  const [error, setError] = useState<ClaimOutcome["error"]>(null);
  const { projects, onChain, loading } = useDisplayProjects();
  const ids = useMemo(() => (onChain ?? []).map((p) => p.id), [onChain]);
  const { positions, reload } = usePortfolio(connected ? address : null, ids);

  const isReal = connected && !!onChain && !!positions;
  let total = BigInt(0);
  const claimableIds: number[] = [];
  positions?.forEach((pos, id) => {
    total += pos.claimable;
    if (pos.claimable > BigInt(0)) claimableIds.push(id);
  });

  const run = async (projectIds: number[], label: string) => {
    if (!connected || !address || projectIds.length === 0) return;
    setClaiming(true);
    setError(null);
    setLast(null);
    const r = await claimProjects(signAndSend, address, projectIds);
    // Receipt and PDF only for claims that reached SUCCESS.
    if (r.hashes.length > 0) setLast({ hashes: r.hashes, claimed: r.claimed, projectName: label });
    setError(r.error);
    await reload();
    setClaiming(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.18em] text-orange-600">
          Distribución de ingresos
        </p>
        <h1 className="text-3xl font-bold text-slate-900 font-display">
          Reclamar ingresos
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          El emisor deposita ingresos con deposit_revenue; tu parte proporcional se reclama con claim_revenue y llega en XLM a tu wallet.
        </p>
      </div>

      {/* Total Card */}
      <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-6 relative">
        {!isReal && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
            DEMO • Testnet
          </span>
        )}
        <div className="text-sm text-slate-500">Total disponible</div>
        <div className="mt-2 font-mono text-4xl font-bold text-slate-900">
          {isReal ? (
            <>
              {formatXlm(total)} <span className="text-xl text-orange-600">XLM</span>
            </>
          ) : (
            "—"
          )}
        </div>
        {!connected && (
          <p className="mt-2 text-xs text-amber-700">Conecta tu wallet para ver tus ingresos por reclamar.</p>
        )}
        <button
          onClick={() => run(claimableIds, "Todos los proyectos")}
          disabled={!isReal || claiming || claimableIds.length === 0}
          className="mt-6 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? (
            "Procesando..."
          ) : (
            <>
              Reclamar todo{claimableIds.length > 1 ? ` (${claimableIds.length} firmas)` : ""}
              <span className="material-symbols-outlined text-[16px]">
                arrow_upward
              </span>
            </>
          )}
        </button>
      </div>

      {error && (
        <Notice tone="error">
          {error.text} {error.hash && <TxLink hash={error.hash} />}
        </Notice>
      )}

      {/* Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-md divide-y divide-slate-100">
        <div className="p-5 font-semibold text-slate-900 font-display">
          Desglose por proyecto
        </div>
        {projects.map((p) => {
          const pos = positions?.get(p.id);
          const amount = pos?.claimable ?? BigInt(0);
          return (
            <div key={p.id} className="flex items-center justify-between p-5">
              <div>
                <div className="font-medium text-slate-700">{p.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {loading
                    ? "Cargando datos on-chain…"
                    : p.isDemo
                      ? "Sin conexión a testnet"
                      : `${p.energyKwh.toLocaleString("en-US")} kWh reportados · id ${p.id}`}{" "}
                  {!isReal && <DemoBadge className="ml-1" />}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-600">
                  {isReal ? `${formatXlm(amount)} XLM` : "—"}
                </span>
                <button
                  onClick={() => run([p.id], p.name)}
                  disabled={!isReal || claiming || amount === BigInt(0)}
                  className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Reclamar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receipt after a successful claim */}
      {last && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-emerald-600 text-[24px]">
              check_circle
            </span>
            <div>
              <div className="font-semibold text-emerald-800">
                Transacción exitosa: {last.claimed !== null ? `${formatXlm(last.claimed)} XLM reclamados` : "reclamo confirmado on-chain"}
              </div>
              <div className="text-xs text-emerald-600 flex flex-wrap gap-2">
                {last.hashes.map((h) => (
                  <TxLink key={h} hash={h} />
                ))}
              </div>
            </div>
          </div>
          <PdfCertificate
            data={{
              projectName: last.projectName,
              location: "Stellar testnet (demo)",
              capacity: "—",
              tokenAmount: "—",
              pricePaid:
                last.claimed !== null ? `${formatXlm(last.claimed, { maxDecimals: 7 })} XLM reclamados` : "Ver la transacción",
              walletAddress: address ?? "—",
              txHash: last.hashes[last.hashes.length - 1],
            }}
          />
        </div>
      )}
    </div>
  );
}

function MetricsView() {
  const { onChain } = useDisplayProjects();
  const energy = onChain ? onChain.reduce((a, p) => a + p.totalEnergyKwh, BigInt(0)) : null;
  const revenue = onChain ? onChain.reduce((a, p) => a + p.totalRevenue, BigInt(0)) : null;
  const minted = onChain ? onChain.reduce((a, p) => a + p.minted, BigInt(0)) : null;
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 font-display">
          Métricas
        </h1>
        <p className="mb-7 text-sm text-slate-500">
          Totales leídos del contrato v2.1. La energía (kWh) la reporta el emisor y queda anclada on-chain; un oráculo IoT firmado está en el roadmap.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon="power"
          label="Energía reportada (on-chain)"
          value={energy != null ? `${energy.toLocaleString("en-US")} kWh` : "1.2M kWh"}
          demo={energy == null}
        />
        <StatCard
          icon="payments"
          label="Ingresos depositados (on-chain)"
          value={revenue != null ? `${formatXlm(revenue)} XLM` : "340 XLM"}
          demo={revenue == null}
        />
        <StatCard
          icon="eco"
          label="Participaciones emitidas"
          value={minted != null ? minted.toString() : "628"}
          demo={minted == null}
        />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-md mt-5 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 font-display">
              Generación de energía
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Curva ilustrativa — no hay telemetría en tiempo real en esta demo
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700 border border-amber-200">
            DEMO • Simulado
          </span>
        </div>
        <MiniChart />
        <div className="mt-4 flex justify-between text-[10px] text-slate-400">
          <span>01 AGO</span>
          <span>15 AGO</span>
          <span>30 AGO</span>
        </div>
      </div>
    </div>
  );
}

/** Parse a whole-number form field (supply, min purchase, kWh). */
function parseWhole(value: string, label: string): bigint {
  const v = value.trim().replace(/[,_\s]/g, "");
  if (!/^\d+$/.test(v)) throw new Error(`${label}: ingresa un número entero`);
  return BigInt(v);
}

function AdminProjectRow({
  project,
  address,
  connected,
  paused,
  onDone,
}: {
  project: DisplayProject;
  address: string | null;
  connected: boolean;
  paused: boolean | null;
  onDone: () => Promise<void>;
}) {
  const { signAndSend } = useWallet();
  const [sales, setSales] = useState<bigint | null>(null);
  const [revenueXlm, setRevenueXlm] = useState("");
  const [energyKwh, setEnergyKwh] = useState("");
  const [withdrawXlm, setWithdrawXlm] = useState("");
  const [busy, setBusy] = useState<"deposit" | "withdraw" | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string; hash?: string } | null>(null);
  const isCreator = !!address && project.creator === address;

  const loadSales = useCallback(async () => {
    if (project.isDemo) return;
    try {
      setSales(toBigIntOr(await readContractNative("get_sales_balance", [project.id]), ZERO));
    } catch {
      setSales(null);
    }
  }, [project.id, project.isDemo]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const handleDeposit = async () => {
    if (!connected || !address) return;
    setMsg(null);
    let amount: bigint;
    let energy: bigint;
    try {
      amount = xlmToStroops(revenueXlm || "0");
      energy = energyKwh.trim() ? parseWhole(energyKwh, "Energía") : BigInt(0);
      if (amount <= BigInt(0)) throw new Error("El monto de ingresos debe ser mayor que cero");
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      return;
    }
    setBusy("deposit");
    try {
      // contract: deposit_revenue(depositor: Address, project_id: u64, amount: u128 stroops, energy_kwh_delta: u128)
      const { txHash } = await signAndSend(CONTRACT_ID, "deposit_revenue", [address, project.id, amount, energy]);
      setMsg({ tone: "success", text: `Depositaste ${formatXlm(amount)} XLM (+${energy.toString()} kWh).`, hash: txHash });
      setRevenueXlm("");
      setEnergyKwh("");
      await onDone();
    } catch (e) {
      setMsg({ tone: "error", text: describeTxError(e), hash: txHashOf(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !address) return;
    setMsg(null);
    let amount: bigint;
    try {
      amount = xlmToStroops(withdrawXlm || "0");
      if (amount <= BigInt(0)) throw new Error("El monto a retirar debe ser mayor que cero");
      if (sales != null && amount > sales) throw new Error(`Saldo de ventas disponible: ${formatXlm(sales)} XLM`);
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      return;
    }
    setBusy("withdraw");
    try {
      // contract: withdraw_sales(caller: Address, project_id: u64, amount: u128 stroops)
      const { txHash } = await signAndSend(CONTRACT_ID, "withdraw_sales", [address, project.id, amount]);
      setMsg({ tone: "success", text: `Retiraste ${formatXlm(amount)} XLM de ventas.`, hash: txHash });
      setWithdrawXlm("");
      await loadSales();
      await onDone();
    } catch (e) {
      setMsg({ tone: "error", text: describeTxError(e), hash: txHashOf(e) });
    } finally {
      setBusy(null);
    }
  };

  const inputCls =
    "w-full border border-slate-200 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
  const canAct = connected && isCreator && !project.isDemo;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-700">{project.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            id {project.id} — {project.progress}% vendido · ventas por retirar:{" "}
            <span className="font-mono">{sales != null ? `${formatXlm(sales)} XLM` : "—"}</span>{" "}
            {project.isDemo && <DemoBadge className="ml-1" />}
          </div>
          {!project.isDemo && !isCreator && (
            <div className="mt-1 text-[11px] text-slate-400">
              Solo el emisor creador ({project.creator ? `${project.creator.slice(0, 4)}…${project.creator.slice(-4)}` : "—"}) puede depositar o retirar.
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
        <label className="text-[11px] text-slate-500">
          Ingresos a depositar (XLM)
          <input className={inputCls} placeholder="40" value={revenueXlm} onChange={(e) => setRevenueXlm(e.target.value)} disabled={!canAct} />
        </label>
        <label className="text-[11px] text-slate-500">
          Energía del periodo (kWh)
          <input className={inputCls} placeholder="0" value={energyKwh} onChange={(e) => setEnergyKwh(e.target.value)} disabled={!canAct} />
        </label>
        <button
          onClick={handleDeposit}
          disabled={!canAct || busy !== null || paused === true}
          title={paused ? "Contrato en pausa: depósitos bloqueados" : undefined}
          className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {busy === "deposit" ? "..." : "Depositar"}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
        <label className="text-[11px] text-slate-500">
          Retirar ventas (XLM)
          <input className={inputCls} placeholder="5" value={withdrawXlm} onChange={(e) => setWithdrawXlm(e.target.value)} disabled={!canAct} />
        </label>
        <button
          onClick={handleWithdraw}
          disabled={!canAct || busy !== null}
          className="border border-amber-200 bg-white text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {busy === "withdraw" ? "..." : "Retirar"}
        </button>
      </div>
      {msg && (
        <Notice tone={msg.tone}>
          {msg.text} {msg.hash && <TxLink hash={msg.hash} />}
        </Notice>
      )}
    </div>
  );
}

function AdminView() {
  const { signAndSend, connected, address } = useWallet();
  const { projects, onChain, reload } = useDisplayProjects();
  const compliance = useComplianceStatus(connected ? address : null);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ tone: "error" | "success"; text: string; hash?: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    supply: "",
    price: "",
    minPurchase: "",
  });

  const mine = onChain && address ? onChain.filter((p) => p.creator === address) : null;
  const isAdmin = !!address && compliance.admin === address;

  const handleCreateProject = async () => {
    if (!connected || !address) return;
    setCreateMsg(null);
    let supply: bigint;
    let price: bigint;
    let minPurchase: bigint;
    try {
      if (!form.name.trim()) throw new Error("Ingresa un nombre para el proyecto");
      // Same bound the contract enforces (InvalidName, #15): 1..64 bytes of UTF-8
      if (new TextEncoder().encode(form.name.trim()).length > 64) {
        throw new Error("El nombre del proyecto no puede superar los 64 bytes (unos 64 caracteres sin tildes)");
      }
      supply = parseWhole(form.supply, "Supply total");
      price = xlmToStroops(form.price.replace(/xlm/i, "").trim());
      minPurchase = parseWhole(form.minPurchase || "1", "Compra mínima");
      if (supply <= BigInt(0) || price <= BigInt(0) || minPurchase <= BigInt(0)) {
        throw new Error("Supply, precio y compra mínima deben ser mayores que cero");
      }
      if (minPurchase > supply) throw new Error("La compra mínima no puede superar el supply");
    } catch (e) {
      setCreateMsg({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      return;
    }
    setCreating(true);
    try {
      // contract: create_project(creator: Address, name: String, total_supply: u128, price: u128 stroops, min_purchase: u128) -> u64
      const { txHash } = await signAndSend(CONTRACT_ID, "create_project", [
        address,
        form.name.trim(),
        supply,
        price,
        minPurchase,
      ]);
      setCreateMsg({ tone: "success", text: `Proyecto "${form.name.trim()}" creado on-chain.`, hash: txHash });
      setForm({ name: "", supply: "", price: "", minPurchase: "" });
      await reload();
    } catch (e) {
      setCreateMsg({ tone: "error", text: describeTxError(e), hash: txHashOf(e) });
    } finally {
      setCreating(false);
    }
  };

  const inputCls =
    "mt-2 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.18em] text-emerald-600">
          Creator console
        </p>
        <h1 className="text-3xl font-bold text-slate-900 font-display">
          Panel de administración
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Emisores verificados: crean proyectos, depositan ingresos (con los kWh del periodo) y retiran ventas.
        </p>
      </div>

      {connected ? (
        <div className="flex flex-col gap-2">
          {compliance.paused === true && (
            <Notice tone="warn">Contrato en pausa: create_project sigue disponible, pero deposit_revenue y las compras están bloqueadas.</Notice>
          )}
          <Notice tone={compliance.isIssuer ? "success" : "warn"}>
            {compliance.isIssuer
              ? "Tu cuenta es un emisor verificado (is_issuer = true): puedes crear proyectos."
              : compliance.isIssuer === false
                ? "Tu cuenta no es un emisor verificado. El administrador debe verificarla (set_issuer) antes de crear proyectos."
                : "Leyendo estado de emisor…"}
            {isAdmin && " Esta cuenta además es el admin del contrato."}
          </Notice>
        </div>
      ) : (
        <Notice tone="info">Conecta tu wallet de emisor para operar.</Notice>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon="wb_sunny" label="Tus proyectos" value={mine ? String(mine.length) : "3"} demo={!mine} />
        <StatCard
          icon="payments"
          label="XLM recibidos por ventas (minted × precio)"
          value={mine ? `${formatXlm(mine.reduce((a, p) => a + p.minted * p.price, BigInt(0)))} XLM` : "1,250 XLM"}
          demo={!mine}
        />
        <StatCard
          icon="bolt"
          label="Ingresos depositados"
          value={mine ? `${formatXlm(mine.reduce((a, p) => a + p.totalRevenue, BigInt(0)))} XLM` : "340 XLM"}
          demo={!mine}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Create Project Form */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-5">
          <h2 className="mb-5 font-semibold text-slate-900 font-display">
            Crear nuevo proyecto
          </h2>
          <div className="flex flex-col gap-4">
            <label className="text-xs text-slate-500">
              Nombre del proyecto
              <input
                className={inputCls}
                placeholder="Ej. Solar Cusco Sur"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-500">
                Supply total (participaciones)
                <input
                  className={inputCls}
                  placeholder="1000"
                  value={form.supply}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supply: e.target.value }))
                  }
                />
              </label>
              <label className="text-xs text-slate-500">
                Precio por participación (XLM)
                <input
                  className={inputCls}
                  placeholder="10"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="text-xs text-slate-500">
              Compra mínima (participaciones)
              <input
                className={inputCls}
                placeholder="1"
                value={form.minPurchase}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minPurchase: e.target.value }))
                }
              />
            </label>
            <button
              onClick={handleCreateProject}
              disabled={!connected || creating || compliance.isIssuer !== true}
              className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                "Creando..."
              ) : (
                <>
                  Crear proyecto
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_upward
                  </span>
                </>
              )}
            </button>
            {createMsg && (
              <Notice tone={createMsg.tone}>
                {createMsg.text} {createMsg.hash && <TxLink hash={createMsg.hash} />}
              </Notice>
            )}
          </div>
        </div>

        {/* Admin Project List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 font-display">
              Proyectos on-chain
            </h2>
            {!onChain && <DemoBadge />}
          </div>
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <AdminProjectRow
                key={p.id}
                project={p}
                address={address}
                connected={connected}
                paused={compliance.paused}
                onDone={reload}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsView({ notify }: { notify: (m: string) => void }) {
  const { projects, loading } = useDisplayProjects();
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-slate-900 font-display">
        Mis proyectos
      </h1>
      <p className="mb-7 text-sm text-slate-500">
        Proyectos demo registrados en el contrato v2.1 de testnet.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isLoading={loading}
            onSelect={() => {
              // Detail pages are statically exported for the ids with metadata.
              if (META_PROJECT_IDS.includes(p.id)) window.location.href = `/project/${p.id}/`;
              else notify(`${p.name}: sin página de detalle en esta demo`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function Page() {
  const { address, balance, connected, connect, signAndSend } = useWallet();
  const [view, setView] = useState<View>("dashboard");
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const title = nav.find((n) => n.id === view)?.label ?? "Dashboard";

  return (
    <main className="min-h-screen bg-surface text-slate-100">
      <div className="flex min-h-screen relative">
        <Sidebar
          view={view}
          setView={setView}
          address={address}
          balance={balance}
          connected={connected}
          connect={connect}
        />
        <div className="min-w-0 flex-1 relative">
          {/* Ambient glow effects - matching landing page */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-200/20 via-emerald-100/30 to-transparent blur-[120px] pointer-events-none -z-10" />
          <div className="absolute top-48 right-10 w-96 h-96 bg-emerald-200/20 blur-[140px] pointer-events-none -z-10" />
          {/* Top Header */}
          <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-xl px-6 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <Logo />
              </div>
              <span className="hidden text-xs text-slate-500 md:block font-body">
                App /{" "}
                <span className="text-slate-700">{title}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700 sm:flex">
                <span className="size-1.5 rounded-full bg-emerald-500" />{" "}
                Testnet
              </div>
              <button
                onClick={() =>
                  connected
                    ? notify(`Wallet conectada: ${address?.slice(0, 4)}...${address?.slice(-4)}`)
                    : connect().catch((e) => console.warn("Freighter connect failed", e))
                }
                className="h-9 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">
                  account_balance_wallet
                </span>
                {connected
                  ? `${address?.slice(0, 4)}...${address?.slice(-4)}`
                  : "Conectar wallet"}
              </button>
              <button className="text-slate-500 md:hidden">
                <span className="material-symbols-outlined text-[20px]">
                  menu
                </span>
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto max-w-[1500px] p-6 pb-28 lg:p-10 lg:pb-10">
            {view === "dashboard" && (
              <DashboardView
                setView={setView}
                signAndSend={signAndSend}
                connected={connected}
                address={address}
              />
            )}
            {view === "projects" && <ProjectsView notify={notify} />}
            {view === "claim" && (
              <ClaimView
                signAndSend={signAndSend}
                connected={connected}
                address={address}
              />
            )}
            {view === "admin" && <AdminView />}
            {view === "metrics" && <MetricsView />}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700 shadow-xl">
          <span className="material-symbols-outlined text-[16px]">check</span>
          {toast}
        </div>
      )}
    </main>
  );
}
