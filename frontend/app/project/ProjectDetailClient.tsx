"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ID, TX_EXPLORER, EXPLORER_URL } from "@/lib/contract";
import { describeTxError, parseContractErrorCode, errorText, txHashOf } from "@/lib/contractErrors";
import { fetchDepositHistory, type DepositEvent } from "@/lib/events";
import { getProjectMeta, projectDisplayName } from "@/lib/projectMeta";
import { lookupOnChainProject, projectPageState, soldPercent, type OnChainProject } from "@/lib/projects";
import { clearReadCache } from "@/lib/readCache";
import { readContractNative } from "@/lib/soroban";
import {
  checkPurchase,
  fetchSpendableStroops,
  parseParticipationCount,
  remainingSupply,
  FEE_MARGIN_STROOPS,
  INVALID_COUNT_MESSAGE,
} from "@/lib/purchaseChecks";
import { formatXlm, stroopsToXlmNumber, toBigInt, type StroopsLike } from "@/lib/units";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import ProjectImagePlaceholder from "@/components/ProjectImagePlaceholder";
import TransactionSigningModal from "@/components/TransactionSigningModal";
import TransactionSuccess from "@/components/TransactionSuccess";
import { ProjectLoading, ProjectNotFound, ProjectUnreachable } from "./ProjectStates";

/* ──────────────────── Constants ──────────────────── */

/** Illustrative documents: none exists for these demo projects. */
const LEGAL_DOCS = [
  { name: "Contrato de venta de energía", icon: "description", ext: "pdf" },
  { name: "Contrato de usufructo", icon: "gavel", ext: "pdf" },
  { name: "Dictamen técnico", icon: "verified", ext: "pdf" },
  { name: "Registro de propiedad", icon: "workspace_premium", ext: "pdf" },
];

/* ──────────────────── Helpers ──────────────────── */

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function shortAddr(a: string) {
  if (!a) return "";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "2-digit" });
}

/* ──────────────────── Component ──────────────────── */

/** `id` is already validated by ProjectRoute (a positive integer from `?id=`). */
export default function ProjectDetailClient({ id }: { id: number }) {
  const {
    connected,
    address,
    balance,
    signAndSend,
    connect,
    fetchBalance,
  } = useWallet();

  const projectId = id;
  const meta = getProjectMeta(projectId);

  /* ── Purchase calculator state: the raw input, validated before any BigInt ── */
  const [countInput, setCountInput] = useState("1");

  /* ── Mounted guard for hydration (prevents React #418) ── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── On-chain project: get_project(u64) + get_project_name(u64), next_project_id to tell "not found" ── */
  const [chainProject, setChainProject] = useState<OnChainProject | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  /** true once the chain proved the id does not exist (ProjectNotFound #6, or id >= next_project_id).
   *  An RPC failure never sets it: that is the DEMO fallback / "sin conexión" case. */
  const [notFound, setNotFound] = useState(false);
  /** true until the first get_project read settles (success or failure). The public RPC
   *  can take 10-20s, so the UI must not claim "sin conexión" while still in flight. */
  const [projectLoading, setProjectLoading] = useState(true);
  const [claimable, setClaimable] = useState<bigint | null>(null);
  const [deposits, setDeposits] = useState<DepositEvent[] | null>(null);
  const [spendable, setSpendable] = useState<bigint | null>(null);
  const compliance = useComplianceStatus(connected ? address : null);

  const loadProject = useCallback(async () => {
    try {
      const r = await lookupOnChainProject(projectId);
      if (r.status === "found") {
        setChainProject(r.project);
        setChainError(null);
        return r.project;
      }
      if (r.status === "not_found") {
        setNotFound(true);
      } else {
        console.warn(`get_project(${projectId}) failed, using DEMO fallback if available`, r.error);
        setChainError(describeTxError(r.error));
      }
      return null;
    } finally {
      setProjectLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setProjectLoading(true);
    void loadProject();
  }, [loadProject]);

  const retryLoad = () => {
    setProjectLoading(true);
    setChainError(null);
    void loadProject();
  };

  useEffect(() => {
    let cancelled = false;
    fetchDepositHistory(projectId)
      .then((d) => !cancelled && setDeposits(d))
      .catch((e) => {
        console.warn("deposit history failed", e);
        if (!cancelled) setDeposits(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const loadWalletData = useCallback(async () => {
    if (!connected || !address) {
      setClaimable(null);
      setSpendable(null);
      return;
    }
    const [c, s] = await Promise.all([
      readContractNative<StroopsLike>("get_claimable", [address, projectId])
        .then((v) => toBigInt(v ?? 0))
        .catch(() => null),
      fetchSpendableStroops(address).catch(() => null),
    ]);
    setClaimable(c);
    setSpendable(s);
  }, [connected, address, projectId]);

  useEffect(() => {
    void loadWalletData();
  }, [loadWalletData]);

  const isDemoChain = !chainProject;
  /** DEMO values of the project's sheet; null without a sheet (then nothing is rendered from them). */
  const fb = meta.fallback;
  const project: OnChainProject = chainProject ?? {
    id: projectId,
    name: fb?.name ?? "",
    creator: "",
    totalSupply: fb?.totalSupply ?? BigInt(0),
    minted: fb?.minted ?? BigInt(0),
    minPurchase: BigInt(1),
    price: fb?.price ?? BigInt(0),
    active: true,
    totalEnergyKwh: BigInt(0),
    totalRevenue: BigInt(0),
    createdAt: BigInt(0),
  };
  const projectName = projectDisplayName(projectId, project.name);
  const fundingPct = soldPercent(project);
  const remaining = remainingSupply(project);
  const onChainEnergy = chainProject ? chainProject.totalEnergyKwh : null;

  /* ── Signing modal state machine ── */
  type SigningPhase =
    | "idle"
    | "preparing"
    | "signing"
    | "submitting"
    | "success"
    | "error"
    | "rejected"
    | "insufficient_balance"
    | "wallet_missing";
  const [signingOpen, setSigningOpen] = useState(false);
  const [signingPhase, setSigningPhase] = useState<SigningPhase>("idle");
  const [signingError, setSigningError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  /* ── Telemetry tab (illustrative) ── */
  const [telemetryTab, setTelemetryTab] = useState<"Hoy" | "7 Días" | "Este Mes" | "Histórico">("Hoy");

  /* ── Derived calculations (amounts in stroops, converted only for display) ── */
  const parsedCount = parseParticipationCount(countInput);
  const amount = parsedCount ?? BigInt(0);
  const tokenCount = Number(amount);
  const totalPriceStroops = project.price * amount;
  const pricePerToken = stroopsToXlmNumber(project.price);
  const costXlm = stroopsToXlmNumber(totalPriceStroops);
  // Illustrative: demo capacity split evenly over the on-chain supply.
  const wpPerToken = project.totalSupply > BigInt(0) ? (meta.capacityKwp * 1000) / Number(project.totalSupply) : 0;
  const capacityAdjudicada = tokenCount * wpPerToken;
  const co2Mitigado = tokenCount * 0.32; // illustrative estimate

  /* ── Pre-checks (a) participant, (b) pause, (c) supply, (d) XLM balance ── */
  const precheck = checkPurchase({
    isParticipant: compliance.isParticipant,
    paused: compliance.paused,
    project: chainProject,
    amount,
    spendableStroops: spendable,
  });
  const buyDisabled = parsedCount === null || (connected && (!precheck.ok || compliance.loading));

  /* ── Handle buy: opens modal, then executes on confirm ── */
  const openSigningModal = useCallback(() => {
    if (!connected) {
      connect().catch((e) => console.warn("Freighter connect failed", e));
      return;
    }
    if (!precheck.ok) return;
    setSigningError("");
    setTxHash("");
    setSigningPhase("idle");
    setSigningOpen(true);
  }, [connected, connect, precheck.ok]);

  const executeBuy = useCallback(async () => {
    if (!connected || !address) {
      setSigningPhase("wallet_missing");
      return;
    }
    // Re-check right before signing with fresh on-chain state (bypass the read cache).
    setSigningPhase("preparing");
    clearReadCache();
    const fresh = await loadProject();
    const freshSpendable = await fetchSpendableStroops(address).catch(() => null);
    const again = checkPurchase({
      isParticipant: compliance.isParticipant,
      paused: compliance.paused,
      project: fresh,
      amount,
      spendableStroops: freshSpendable,
    });
    if (again.blockers.some((b) => b.code === "balance")) {
      setSigningPhase("insufficient_balance");
      return;
    }
    if (again.blockers.length > 0) {
      setSigningError(again.blockers.map((b) => b.message).join(" "));
      setSigningPhase("error");
      return;
    }

    try {
      // contract: purchase_tokens(buyer: Address, project_id: u64, amount: u128)
      setSigningPhase("signing");
      const { txHash: hash } = await signAndSend(CONTRACT_ID, "purchase_tokens", [address, projectId, amount], {
        onSigned: () => setSigningPhase("submitting"),
      });
      // signAndSend resolves only once getTransaction returned SUCCESS.
      setTxHash(hash);
      setSigningPhase("success");
      fetchBalance();
      void loadProject();
      void loadWalletData();
    } catch (err: unknown) {
      const msg = errorText(err);
      const code = parseContractErrorCode(msg);
      // Hash of a sent but failed or unconfirmed purchase, linked from the error box.
      setTxHash(txHashOf(err) ?? "");
      if (code === 11 || (code === null && /underfunded|txInsufficientBalance|tx_insufficient_balance|NOT_ENOUGH_BALANCE/i.test(msg))) {
        setSigningPhase("insufficient_balance");
      } else if (code === null && /reject|cancel|declin|denied|Request closed/i.test(msg)) {
        setSigningPhase("rejected");
      } else if (code === null && /not installed|is not defined|window\.freighter/i.test(msg)) {
        setSigningPhase("wallet_missing");
      } else {
        setSigningError(describeTxError(err));
        setSigningPhase("error");
      }
    }
  }, [
    connected,
    address,
    amount,
    compliance.isParticipant,
    compliance.paused,
    loadProject,
    loadWalletData,
    signAndSend,
    fetchBalance,
    projectId,
  ]);

  /* ── SVG solar curve data (illustrative) ── */
  const solarPoints = [
    0, 12, 35, 62, 85, 100, 110, 115, 118, 118, 114, 105, 92, 74, 52, 30,
    14, 0,
  ];

  /* ── Page state (after every hook). A project without a sheet has no DEMO values:
        it gets a loading or "sin conexión" screen instead of invented numbers. ── */
  const pageState = projectPageState({ id: projectId, notFound, project: chainProject, loading: projectLoading });
  if (pageState === "not_found") return <ProjectNotFound reason="not_on_chain" id={projectId} />;
  if (!fb && pageState === "loading") return <ProjectLoading id={projectId} />;
  if (!fb && pageState === "unreachable") {
    return <ProjectUnreachable id={projectId} error={chainError} onRetry={retryLoad} />;
  }
  /** Illustrative figures (capacity, CO2) exist only for projects with a sheet. */
  const illustrativeWp = meta.hasSheet ? capacityAdjudicada : null;

  return (
    <div className="relative min-h-screen bg-slate-50 font-body text-slate-900">
      {/* ═══════════ A) Ambient glow background ═══════════ */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-emerald-200/25 via-emerald-100/15 to-transparent blur-[160px]" />
        <div className="absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-orange-200/20 via-amber-100/10 to-transparent blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-100/20 to-transparent blur-[120px]" />
      </div>

      {/* ═══════════ B) Fixed header ═══════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-10">
          <a
            href="/"
            className="flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Volver al Directorio
          </a>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              {meta.hasSheet ? "Proyecto demo · datos del activo ficticios" : "Proyecto registrado on-chain · sin ficha descriptiva"}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Stellar Testnet
            </span>
          </div>
        </div>
      </header>

      {/* ═══════════ Main ═══════════ */}
      <main className="mx-auto max-w-7xl px-5 lg:px-10 pt-20 pb-20">
        {/* ═══════════ C) Breadcrumb ═══════════ */}
        <nav className="mb-6 flex items-center gap-2 text-[13px] text-slate-500">
          <a href="/" className="hover:text-slate-900 transition-colors">
            Proyectos Solares
          </a>
          <span className="material-symbols-outlined text-[14px]">
            chevron_right
          </span>
          {meta.hasSheet && (
            <>
              <span>Per&uacute;</span>
              <span className="material-symbols-outlined text-[14px]">
                chevron_right
              </span>
            </>
          )}
          <span className="font-medium text-slate-900">
            {meta.hasSheet ? `${projectName} (${meta.capacity})` : projectName}
          </span>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            Oráculo IoT firmado: roadmap
          </span>
        </nav>

        {/* ═══════════ D) Project header ═══════════ */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                projectLoading
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : isDemoChain
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {projectLoading
                ? "Cargando datos on-chain…"
                : isDemoChain
                  ? "DEMO · sin conexión a testnet"
                  : `On-chain · proyecto #${projectId}`}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              <span className="material-symbols-outlined text-[12px]">
                info
              </span>
              Sin auditoría legal: demo de testnet
            </span>
            {meta.asset && (
              <span className="font-mono text-[11px] text-slate-400">
                Asset ID: {meta.asset}
              </span>
            )}
          </div>

          <h1 className="font-display text-[32px] font-bold leading-tight text-slate-900 lg:text-[42px]">
            {projectName} {meta.flag}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-600">
            {meta.description} La energía (kWh) la reporta el emisor y queda
            anclada on-chain con update_energy; un oráculo IoT firmado está en el
            roadmap. Los ingresos se reparten on-chain con el contrato Soroban en
            Stellar testnet.
          </p>
          {chainError && (
            <p className="mt-2 max-w-2xl text-[12px] text-amber-700">
              No se pudo leer el proyecto on-chain ({chainError}).{" "}
              {isDemoChain ? "Se muestran valores DEMO." : "Se muestran los últimos datos leídos."}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              disabled
              title="No disponible en esta demo"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-400 shadow-sm cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">
                description
              </span>
              Ficha Técnica PDF (demo)
            </button>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                open_in_new
              </span>
              Ver en Soroban Explorer
            </a>
            <span className="font-mono text-[11px] text-slate-400">
              {shortAddr(CONTRACT_ID)}
            </span>
          </div>
        </div>

        {/* ═══════════ E) 6-metric banner grid ═══════════ */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              icon: "solar_power",
              label: meta.hasSheet ? "Capacidad (demo)" : "Capacidad",
              value: meta.capacity,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: "confirmation_number",
              label: "Vendidas",
              value: `${project.minted.toString()} / ${project.totalSupply.toString()}`,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: "token",
              label: "Precio",
              value: `${formatXlm(project.price)} XLM`,
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              icon: "bolt",
              label: "Energía reportada",
              value: onChainEnergy != null ? `${onChainEnergy.toLocaleString("en-US")} kWh` : "—",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              icon: "shopping_cart",
              label: "Compra mínima",
              value: project.minPurchase.toString(),
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: "account_balance",
              label: "Adquirido",
              value: `${fundingPct}%`,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              extra: (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${fundingPct}%` }}
                  />
                </div>
              ),
            },
          ].map((m, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {isDemoChain && !projectLoading && i > 0 && (
                <span className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
                  DEMO
                </span>
              )}
              <span
                className={`material-symbols-outlined mb-1.5 text-[20px] ${m.color}`}
              >
                {m.icon}
              </span>
              <div className="text-[12px] font-medium text-slate-500">
                {m.label}
              </div>
              <div className="font-mono text-[18px] font-bold text-slate-900">
                {m.value}
              </div>
              {m.extra}
            </div>
          ))}
        </div>

        {/* ═══════════ F) 2-column layout ═══════════ */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* ──── LEFT COLUMN (8 cols) ──── */}
          <div className="space-y-8 lg:col-span-8">
            {/* Hero image (a neutral placeholder for a project without a sheet) */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
              {meta.image ? (
                <>
                  <img
                    src={meta.image}
                    alt={`Imagen ilustrativa de ${projectName}`}
                    className="h-[320px] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      <span className="material-symbols-outlined text-[14px]">
                        image
                      </span>
                      Imagen ilustrativa (stock)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      <span className="material-symbols-outlined text-[14px]">
                        location_on
                      </span>
                      {meta.location}
                    </span>
                  </div>
                </>
              ) : (
                <ProjectImagePlaceholder className="h-[320px] w-full" />
              )}
            </div>

            {/* Location metadata */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-display text-[16px] font-bold text-slate-900">
                Informaci&oacute;n del Activo{" "}
                <span className="text-[11px] font-mono font-semibold text-amber-700">
                  {meta.hasSheet ? "(demo, datos ficticios)" : "(sin ficha descriptiva)"}
                </span>
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Ubicaci&oacute;n
                  </div>
                  <div className="text-[14px] font-medium text-slate-900">
                    {meta.location || "No informada"}
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-slate-500">
                    {meta.hasSheet ? "Referencial" : "Sin ficha descriptiva"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Registro de propiedad
                  </div>
                  <div className="text-[14px] font-medium text-slate-900">
                    No aplica (demo)
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-slate-500">
                    Sin inscripción registral
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Registro on-chain
                  </div>
                  <div className="text-[14px] font-medium text-slate-900">
                    Proyecto #{projectId}
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-slate-500" title={project.creator}>
                    Emisor {project.creator ? shortAddr(project.creator) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Telemetry section (illustrative; only the on-chain anchor without a sheet) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-[16px] font-bold text-slate-900">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600">
                    sensors
                  </span>
                  {meta.hasSheet ? <>Telemetr&iacute;a (simulada)</> : <>Energ&iacute;a reportada</>}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <span className="material-symbols-outlined text-[10px]">
                    science
                  </span>
                  {meta.hasSheet ? "DEMO · oráculo IoT en roadmap" : "Oráculo IoT en roadmap"}
                </span>
              </div>

              {meta.hasSheet && (
              <>
              {/* Time switcher tabs */}
              <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
                {(["Hoy", "7 Días", "Este Mes", "Histórico"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setTelemetryTab(tab)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${
                        telemetryTab === tab
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>

              {/* 4 illustrative gauges */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Potencia",
                    value: "118.4",
                    unit: "kW",
                    icon: "bolt",
                    color: "text-amber-600",
                  },
                  {
                    label: "Irradiancia",
                    value: "940",
                    unit: "W/m²",
                    icon: "wb_sunny",
                    color: "text-orange-500",
                  },
                  {
                    label: "Temp.",
                    value: "42.1",
                    unit: "°C",
                    icon: "thermostat",
                    color: "text-red-500",
                  },
                  {
                    label: "Eficiencia",
                    value: "98.2",
                    unit: "%",
                    icon: "speed",
                    color: "text-emerald-600",
                  },
                ].map((g, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center"
                  >
                    <span
                      className={`material-symbols-outlined mb-1 text-[18px] ${g.color}`}
                    >
                      {g.icon}
                    </span>
                    <div className="font-mono text-[22px] font-bold text-slate-900">
                      {g.value}
                      <span className="ml-0.5 text-[12px] font-medium text-slate-500">
                        {g.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{g.label}</div>
                  </div>
                ))}
              </div>
              </>
              )}
              {/* On-chain anchor vs. simulated gauges */}
              <div
                className={`${meta.hasSheet ? "mb-5 " : ""}flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono ${
                  projectLoading
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : isDemoChain
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {projectLoading ? "autorenew" : isDemoChain ? "science" : "verified"}
                </span>
                {projectLoading
                  ? "Cargando datos on-chain…"
                  : isDemoChain
                    ? "DEMO • Simulado — sin conexión al contrato"
                    : `${meta.hasSheet ? "Medidores simulados. " : ""}Anclado on-chain por el emisor: ${(onChainEnergy ?? BigInt(0)).toLocaleString("en-US")} kWh`}
                {claimable != null && connected && (
                  <span className="ml-auto font-bold">por reclamar: {formatXlm(claimable)} XLM</span>
                )}
              </div>

              {/* SVG solar production curve */}
              {meta.hasSheet && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-[12px] font-medium text-slate-500">
                  Curva de Producci&oacute;n Solar (ilustrativa) &mdash; {telemetryTab}
                </div>
                <svg
                  viewBox="0 0 360 120"
                  className="h-32 w-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      id="solarGrad"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                      <stop
                        offset="100%"
                        stopColor="#059669"
                        stopOpacity="0.02"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${120 - (solarPoints[0] / 120) * 120} ${solarPoints
                      .map(
                        (p, i) =>
                          `L${(i / (solarPoints.length - 1)) * 360},${
                            120 - (p / 120) * 120
                          }`
                      )
                      .join(" ")} L360,120 L0,120 Z`}
                    fill="url(#solarGrad)"
                  />
                  <path
                    d={`M0,${120 - (solarPoints[0] / 120) * 120} ${solarPoints
                      .map(
                        (p, i) =>
                          `L${(i / (solarPoints.length - 1)) * 360},${
                            120 - (p / 120) * 120
                          }`
                      )
                      .join(" ")}`}
                    stroke="#059669"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* current point */}
                  <circle
                    cx="200"
                    cy={120 - (118 / 120) * 120}
                    r="4"
                    fill="#059669"
                  />
                  <text
                    x="206"
                    y={120 - (118 / 120) * 120 - 6}
                    fill="#059669"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    118.4 kW
                  </text>
                </svg>
              </div>
              )}
            </div>

            {/* How value flows (what the contract really does) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-display text-[16px] font-bold text-slate-900">
                Cómo funciona en esta demo
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: "handshake",
                    title: "Comprador de energía",
                    desc: "Ficticio. No existe un contrato de venta de energía real detrás de este proyecto demo.",
                    accent: "border-l-emerald-500",
                  },
                  {
                    icon: "account_balance",
                    title: "Custodia de fondos",
                    desc: "El contrato Soroban. Tus XLM quedan en el contrato hasta que el emisor retira ventas (withdraw_sales) o tú reclamas ingresos (claim_revenue).",
                    accent: "border-l-blue-500",
                  },
                  {
                    icon: "verified",
                    title: "Verificación",
                    desc: "Emisores verificados y participantes aprobados on-chain (KYC simulado). Auditoría técnica y legal: pendiente.",
                    accent: "border-l-orange-500",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border border-slate-100 border-l-4 ${item.accent} bg-slate-50 p-4`}
                  >
                    <span className="material-symbols-outlined mb-2 text-[24px] text-slate-700">
                      {item.icon}
                    </span>
                    <div className="mb-1 font-display text-[14px] font-bold text-slate-900">
                      {item.title}
                    </div>
                    <div className="text-[13px] leading-relaxed text-slate-600">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue deposits read from `deposit` events */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 font-display text-[16px] font-bold text-slate-900">
                Distribuci&oacute;n de Ingresos
              </h3>
              <p className="mb-4 text-[12px] text-slate-500">
                Depósitos on-chain (eventos <span className="font-mono">deposit</span> del contrato, ventana de ~7 días de la RPC).
                Total histórico depositado: <span className="font-mono">{isDemoChain ? "—" : `${formatXlm(project.totalRevenue)} XLM`}</span>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 pr-4 font-semibold text-slate-500">
                        Fecha
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-slate-500">
                        kWh
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-slate-500">
                        Total
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-slate-500">
                        Ingresos/Participación
                      </th>
                      <th className="pb-2 font-semibold text-slate-500">
                        Hash Stellar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits && deposits.length > 0 ? (
                      deposits.map((d) => (
                        <tr
                          key={d.txHash}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-slate-900">
                            {formatDate(d.ledgerClosedAt)}
                          </td>
                          <td className="py-3 pr-4 font-mono text-slate-700">
                            {d.energyDelta.toLocaleString("en-US")}
                          </td>
                          <td className="py-3 pr-4 font-mono font-semibold text-emerald-600">
                            {formatXlm(d.amount)} XLM
                          </td>
                          <td className="py-3 pr-4 font-mono text-slate-700" title="Aproximado con las participaciones emitidas hoy">
                            {project.minted > BigInt(0)
                              ? `~${formatXlm(d.amount / project.minted, { maxDecimals: 4 })} XLM`
                              : "—"}
                          </td>
                          <td className="py-3">
                            <a
                              href={TX_EXPLORER(d.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[12px] text-slate-600 hover:underline"
                            >
                              <span className="material-symbols-outlined text-[12px] text-emerald-600">
                                link
                              </span>
                              {d.txHash.slice(0, 4)}...{d.txHash.slice(-4)}
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-[12px] text-slate-500">
                          {deposits === null
                            ? "No se pudieron leer los eventos de la RPC."
                            : "Sin depósitos de ingresos en la ventana de retención de la RPC."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Documents (none exist for a demo project) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-display text-[16px] font-bold text-slate-900">
                Documentos Legales <span className="text-[11px] font-mono font-semibold text-amber-700">(no disponibles en la demo)</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {LEGAL_DOCS.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-slate-400">
                        {doc.icon}
                      </span>
                      <div>
                        <div className="text-[13px] font-medium text-slate-900">
                          {doc.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 uppercase">
                          .{doc.ext}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-400 shadow-sm cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        block
                      </span>
                      No disponible
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ──── RIGHT COLUMN (4 cols, sticky) ──── */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 space-y-4">
              {/* Purchase widget card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {/* Card header */}
                <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-orange-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[14px] font-bold text-slate-900">
                      Participaci&oacute;n Directa Soroban
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      <span className="material-symbols-outlined text-[12px]">
                        token
                      </span>
                      {formatXlm(project.price)} XLM
                    </span>
                  </div>
                </div>

                {/* Payment asset: native XLM only */}
                <div className="px-6 pt-5">
                  <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
                    <span className="flex-1 rounded-md py-1.5 text-center text-[12px] font-semibold bg-white text-slate-900 shadow-sm">
                      Pago en XLM nativo (testnet)
                    </span>
                  </div>
                </div>

                {/* Token input + pills */}
                <div className="px-6 pb-4">
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-500">
                    Cantidad de participaciones
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    aria-invalid={parsedCount === null}
                    className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-[24px] font-bold text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {parsedCount === null && (
                    <p className="-mt-2 mb-3 text-[12px] text-red-600">{INVALID_COUNT_MESSAGE}</p>
                  )}
                  <div className="mb-4 flex gap-2">
                    {[10, 50, 100].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCountInput(String(n))}
                        className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[12px] font-semibold text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setCountInput(remaining > BigInt(0) ? remaining.toString() : "1")}
                      title={`Supply disponible: ${remaining.toString()}`}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[12px] font-semibold text-slate-600 transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                    >
                      M&aacute;x
                    </button>
                  </div>
                </div>

                {/* Real-time calculated metrics */}
                <div className="mx-6 mb-4 space-y-2 rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-500">Costo Total</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatXlm(totalPriceStroops)} XLM
                    </span>
                  </div>
                  {illustrativeWp != null && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-500">
                        Capacidad equivalente (ilustrativa)
                      </span>
                      <span className="font-mono font-bold text-emerald-600">
                        {fmt(illustrativeWp, 1)} Wp
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-500">Precio por participación</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {fmt(pricePerToken, 2)} XLM
                    </span>
                  </div>
                  {meta.hasSheet && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-500">CO&#x2082; (estimación demo)</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {fmt(co2Mitigado, 2)} ton/a&ntilde;o
                      </span>
                    </div>
                  )}
                </div>

                {/* Wallet pill */}
                <div className="px-6 pb-4">
                  {!mounted ? (
                    <div className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-2">
                      <span className="h-4 w-4 rounded-full bg-slate-200 animate-pulse" />
                    </div>
                  ) : connected ? (
                    <div className="mb-3 flex items-center justify-between rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-mono text-[12px] font-medium text-emerald-700">
                          {shortAddr(address || "")}
                        </span>
                      </div>
                      <span className="font-mono text-[12px] text-slate-500">
                        {balance} XLM
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => connect().catch((e) => console.warn("Freighter connect failed", e))}
                      className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-2 text-[13px] font-medium text-slate-600 transition-all hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        account_balance_wallet
                      </span>
                      Conectar Freighter
                    </button>
                  )}
                </div>

                {/* Compliance / pre-check banners */}
                {mounted && connected && (
                  <div className="px-6 pb-3 space-y-2">
                    {compliance.paused === true && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                        Contrato en pausa: las compras están bloqueadas temporalmente.
                      </div>
                    )}
                    {precheck.blockers
                      .filter((b) => b.code !== "paused" && !(parsedCount === null && b.code === "invalid_amount"))
                      .map((b) => (
                        <div
                          key={b.code}
                          className={`rounded-lg border px-3 py-2 text-[12px] ${
                            b.code === "not_participant"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {b.message}
                        </div>
                      ))}
                    {compliance.isParticipant === true && precheck.blockers.length === 0 && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                        Cuenta aprobada como participante (KYC simulado). Se reservan {formatXlm(FEE_MARGIN_STROOPS)} XLM para comisiones.
                      </div>
                    )}
                    {precheck.pending && !compliance.loading && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                        Verificando estado on-chain y saldo…
                      </div>
                    )}
                  </div>
                )}

                {/* CTA button */}
                <div className="px-6 pb-5">
                  <button
                    onClick={openSigningModal}
                    disabled={mounted && buyDisabled}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      lock
                    </span>
                    {mounted && !connected ? "Conectar Freighter para participar" : "Confirmar y Firmar en Stellar"}
                  </button>
                </div>

                {/* What the signature does */}
                <div className="border-t border-slate-100 px-6 py-4">
                  <div className="space-y-2">
                    {[
                      {
                        icon: "shield",
                        text: "Sin custodia de llaves: firmas en Freighter",
                      },
                      {
                        icon: "swap_horiz",
                        text: "Tus XLM van al contrato; tu participación queda registrada on-chain (no transferible en esta demo)",
                      },
                      {
                        icon: "receipt_long",
                        text: "Comprobante PDF de la transacción (sin valor legal)",
                      },
                    ].map((g, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px] text-slate-500"
                      >
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">
                          {g.icon}
                        </span>
                        {g.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Support box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-slate-600">
                    support_agent
                  </span>
                  <span className="font-display text-[14px] font-bold text-slate-900">
                    Asesor&iacute;a Institucional
                  </span>
                </div>
                <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
                  ¿Tienes un proyecto solar? Contáctanos para conversar sobre
                  cómo registrarlo en la plataforma.
                </p>
                <button className="w-full rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-700 transition-all hover:bg-slate-50">
                  Contactar Equipo
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════ Signing Modal ═══════════ */}
      <TransactionSigningModal
        open={signingOpen}
        onClose={() => {
          setSigningOpen(false);
          // Reset to idle after close animation
          setTimeout(() => setSigningPhase("idle"), 200);
        }}
        onConfirm={executeBuy}
        phase={signingPhase}
        errorMessage={signingError}
        txHash={txHash}
        projectName={projectName}
        projectFlag={meta.flag}
        assetId={meta.asset || `Proyecto #${projectId}`}
        tokenCount={tokenCount}
        costXlm={costXlm}
        capacityWp={illustrativeWp}
        walletAddress={address || ""}
        walletBalance={balance}
        contractId={CONTRACT_ID}
      />

      {/* ═══════════ Success Screen ═══════════ */}
      <TransactionSuccess
        open={signingPhase === "success" && !!txHash}
        onClose={() => {
          setSigningOpen(false);
          setSigningPhase("idle");
          setTxHash("");
        }}
        txHash={txHash}
        tokenCount={tokenCount}
        costXlm={costXlm}
        projectName={projectName}
        projectFlag={meta.flag}
        assetId={meta.asset || `Proyecto #${projectId}`}
        walletAddress={address || ""}
        capacityWp={illustrativeWp}
        contractId={CONTRACT_ID}
        location={meta.location || "Ubicación no informada"}
      />
    </div>
  );
}
