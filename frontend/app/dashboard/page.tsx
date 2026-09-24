"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ID } from "@/lib/contract";
import PdfCertificate from "@/components/PdfCertificate";
import ProtocolVerification from "@/components/ProtocolVerification";
import { useHolderMetrics } from "@/hooks/useHolderMetrics";

/* ── Constants ── */
type View = "dashboard" | "projects" | "claim" | "metrics" | "admin";

const projects = [
  {
    name: "Solar Lima Norte",
    location: "Lima, Perú",
    capacity: "150 kW",
    tokens: "15",
    invested: "150",
    dividends: "8.2",
    energy: "45,200",
    apy: "12.5%",
    progress: 68,
    tone: "lime" as const,
    projectId: 0,
  },
  {
    name: "Solar Arequipa",
    location: "Arequipa, Perú",
    capacity: "320 kW",
    tokens: "20",
    invested: "200",
    dividends: "12.1",
    energy: "82,640",
    apy: "14.2%",
    progress: 84,
    tone: "orange" as const,
    projectId: 1,
  },
  {
    name: "Solar San Martín",
    location: "Tarapoto, Perú",
    capacity: "90 kW",
    tokens: "10",
    invested: "100",
    dividends: "3.1",
    energy: "26,880",
    apy: "11.8%",
    progress: 42,
    tone: "amber" as const,
    projectId: 2,
  },
];

const nav = [
  { id: "dashboard" as const, label: "Dashboard", icon: "home" },
  { id: "projects" as const, label: "Mis proyectos", icon: "battery_charging_full" },
  { id: "claim" as const, label: "Reclamar dividendos", icon: "payments" },
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
      aria-label="Revenue trend chart"
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

function StatCard({
  icon,
  label,
  value,
  change,
  action,
  onAction,
  demo,
}: {
  icon: string;
  label: string;
  value: string;
  change?: string;
  action?: string;
  onAction?: () => void;
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
            className="h-7 bg-orange-600 hover:bg-orange-700 px-2.5 rounded-lg text-xs text-white font-semibold transition-colors"
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
              onClick={connect}
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
  realProgress,
  realPrice,
  isLoading,
}: {
  project: (typeof projects)[number];
  onSelect: () => void;
  realProgress?: number | null;
  realPrice?: string | null;
  isLoading?: boolean;
}) {
  const displayProgress = realProgress != null ? realProgress : project.progress;
  const displayPrice = realPrice != null ? realPrice : "10 XLM";
  const isDemo = realProgress == null && !isLoading;
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
            <div className="text-xs text-slate-500">{project.location}</div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 border border-emerald-200">
            Activo
          </span>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-slate-500">Capacidad</div>
            <div className="mt-1 font-mono text-sm text-slate-700">
              {project.capacity}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">APY estimado</div>
            <div className="mt-1 font-mono text-sm text-emerald-600">
              {project.apy}
              <sup className="ml-1 text-[10px] text-slate-400" title="Proyección PPA, no garantizada">
                *Estimado
              </sup>
            </div>
          </div>
        </div>
        <MiniChart orange={project.tone === "orange"} />
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">Tokens vendidos</span>
          <span className="font-mono text-slate-600" title={isDemo ? "Valor demo — conectando a testnet" : "Valor on-chain: minted/total_supply"}>
            {isLoading ? "…" : `${displayProgress}%`}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full",
              project.tone === "orange" ? "bg-orange-500" : "bg-emerald-500"
            )}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-sm text-slate-900" title={isDemo ? "Precio demo — on-chain fallback 10 XLM" : `Precio on-chain: ${displayPrice} stroops→XLM`}>
            {displayPrice}{" "}
            <span className="font-sans text-xs text-slate-500">/ token</span>
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

/* ── View Sections ── */

function DashboardView({
  setView,
  signAndSend,
  connected,
  address,
}: {
  setView: (v: View) => void;
  signAndSend: (
    contractId: string,
    method: string,
    args: unknown[]
  ) => Promise<{ txHash: string; result?: unknown }>;
  connected: boolean;
  address?: string | null;
}) {
  const [claiming, setClaiming] = useState(false);
  const { readContract } = useWallet();
  const { metrics: holderMetrics } = useHolderMetrics();
  const [chainProjects, setChainProjects] = useState<Record<number, { progress: number; priceXlm: string; minted: bigint; total: bigint } > | null>(null);
  const [isChainLoading, setIsChainLoading] = useState(true);
  const [realClaimable, setRealClaimable] = useState<string | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [verifyNextId, setVerifyNextId] = useState<number | null>(null);
  const [verifyMinted, setVerifyMinted] = useState<string | null>(null);

  const handleClaimAll = async () => {
    if (!connected || !address) return;
    setClaiming(true);
    try {
      // contract: claim_revenue(investor: Address, project_id: u64) — IDs start at 1
      await signAndSend(CONTRACT_ID, "claim_revenue", [address, 1]);
    } catch (e) {
      console.error("Claim failed:", e);
    } finally {
      setClaiming(false);
    }
  };

  // Fetch on-chain project data: next_project_id + get_project loop
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = await import("@stellar/stellar-sdk");
        const decode = (val: unknown) => {
          try {
            return (sdk as unknown as { scValToNative: (v: unknown) => unknown }).scValToNative(val as never);
          } catch {
            return val;
          }
        };
        let nextId = 1;
        try {
          const rawNext = await readContract(CONTRACT_ID, "next_project_id", []);
          const decoded = decode(rawNext);
          if (typeof decoded === "bigint") nextId = Number(decoded);
          else if (typeof decoded === "number") nextId = decoded;
          else if (decoded != null) nextId = Number(decoded as string);
        } catch (e) {
          console.warn("next_project_id failed, using fallback", e);
          nextId = 4; // fallback to try 1..3
        }
        const ids = [];
        for (let i = 1; i < nextId; i++) ids.push(i);
        // limit to 3 for UI, but if nextId is 1 (no project yet) fallback to 1..3 to show demo gracefully
        const fetchIds = ids.length > 0 ? ids.slice(0, 3) : [1, 2, 3];
        const results = await Promise.all(
          fetchIds.map(async (id) => {
            try {
              const raw = await readContract(CONTRACT_ID, "get_project", [id]);
              const p = decode(raw) as Record<string, unknown>;
              const total = BigInt((p.total_supply ?? p.totalSupply ?? 0) as string | number | bigint);
              const minted = BigInt((p.minted ?? 0) as string | number | bigint);
              const price = BigInt((p.price ?? 0) as string | number | bigint);
              const progress = total > BigInt(0) ? Number((minted * BigInt(100)) / total) : 0;
              const priceXlm = (Number(price) / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " XLM";
              return { id, progress, priceXlm, minted, total };
            } catch (e) {
              console.warn(`get_project(${id}) failed, keeping mock`, e);
              return null;
            }
          })
        );
        if (cancelled) return;
        const map: Record<number, { progress: number; priceXlm: string; minted: bigint; total: bigint }> = {};
        results.forEach((r) => {
          if (r) map[r.id] = r;
        });
        if (Object.keys(map).length > 0) setChainProjects(map);
      } catch (e) {
        console.warn("chain projects fetch failed", e);
      } finally {
        if (!cancelled) setIsChainLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readContract]);

  // Fetch real dividends via get_portfolio or get_claimable
  useEffect(() => {
    if (!connected || !address) {
      setRealClaimable(null);
      return;
    }
    let cancelled = false;
    setIsPortfolioLoading(true);
    (async () => {
      try {
        const sdk = await import("@stellar/stellar-sdk");
        const decode = (val: unknown) => {
          try {
            return (sdk as unknown as { scValToNative: (v: unknown) => unknown }).scValToNative(val as never);
          } catch {
            return val;
          }
        };
        // Try get_portfolio for [1,2,3]
        let totalClaimable = BigInt(0);
        try {
          const raw = await readContract(CONTRACT_ID, "get_portfolio", [address, [1, 2, 3]]);
          const positions = decode(raw) as Array<Record<string, unknown>>;
          if (Array.isArray(positions)) {
            for (const pos of positions) {
              const amt = BigInt((pos.claimable_amount ?? pos.claimableAmount ?? 0) as string | number | bigint);
              totalClaimable += amt;
            }
          }
        } catch {
          // fallback: per-project get_claimable
          const ids = [1, 2, 3];
          for (const pid of ids) {
            try {
              const raw = await readContract(CONTRACT_ID, "get_claimable", [address, pid]);
              const val = decode(raw);
              totalClaimable += BigInt(val as string | number | bigint);
            } catch (e) {
              console.warn(`get_claimable ${pid} failed`, e);
            }
          }
        }
        if (!cancelled) {
          if (totalClaimable > BigInt(0)) {
            const xlm = Number(totalClaimable) / 1_000_000;
            setRealClaimable(xlm.toLocaleString("en-US", { maximumFractionDigits: 2 }));
          } else {
            setRealClaimable("0.00");
          }
        }
      } catch (e) {
        console.warn("portfolio fetch failed", e);
      } finally {
        if (!cancelled) setIsPortfolioLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, address, readContract]);

  // Verification panel derived data
  useEffect(() => {
    if (!chainProjects) return;
    const ids = Object.keys(chainProjects).map(Number);
    const total = Object.values(chainProjects).reduce((acc, v) => acc + v.minted, BigInt(0));
    // nextProjectId is max id +1, or 1 if none
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    setVerifyNextId(maxId > 0 ? maxId + 1 : null);
    setVerifyMinted(total > BigInt(0) ? total.toString() : null);
  }, [chainProjects]);

  const dividendDisplay = connected && realClaimable != null ? `${realClaimable} XLM` : "23.4 XLM";
  const dividendIsDemo = !connected || realClaimable == null;
  const investmentDisplay = "450 XLM";
  const tokensDisplay = "45";

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[.18em] text-emerald-600">
            Resumen de inversión
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
            Buenos días, inversor
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tu portafolio está generando energía limpia hoy.
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

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon="payments"
          label="Mi inversión"
          value={investmentDisplay}
          change="+12.5% ↑"
          demo={dividendIsDemo}
        />
        <StatCard
          icon="bolt"
          label="Dividendos pendientes"
          value={isPortfolioLoading ? "…" : dividendDisplay}
          action="Reclamar todo"
          onAction={handleClaimAll}
          demo={dividendIsDemo}
        />
        <StatCard
          icon="eco"
          label="Tokens en posesión"
          value={tokensDisplay}
          change="En 3 proyectos"
          demo={dividendIsDemo}
        />
      </div>

      <ProtocolVerification
        metrics={holderMetrics}
        nextProjectId={verifyNextId}
        totalMinted={verifyMinted}
      />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 font-display">
              Proyectos destacados
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Activos solares con datos on-chain en tiempo real
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
          {projects.map((p, idx) => {
            const chainId = idx + 1;
            const chain = chainProjects?.[chainId];
            return (
              <ProjectCard
                key={p.name}
                project={p}
                onSelect={() => setView("projects")}
                realProgress={chain?.progress ?? null}
                realPrice={chain?.priceXlm ?? null}
                isLoading={isChainLoading}
              />
            );
          })}
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
                Rendimiento de tus activos
              </p>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[20px]">
                more_horiz
              </span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Proyecto</th>
                  <th className="pb-3 font-medium">Tokens</th>
                  <th className="pb-3 font-medium">Inversión</th>
                  <th className="pb-3 font-medium">Dividendos</th>
                  <th className="pb-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.name}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 font-medium text-slate-700">
                      {p.name}
                    </td>
                    <td className="py-4 font-mono text-slate-600">
                      {p.tokens}
                    </td>
                    <td className="py-4 font-mono text-slate-600">
                      {p.invested} XLM
                    </td>
                    <td className="py-4 font-mono text-emerald-600">
                      {p.dividends} XLM {dividendIsDemo && <span className="ml-1 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px]">DEMO</span>}
                    </td>
                    <td className="py-4">
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          check
                        </span>{" "}
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 font-display">
              Actividad reciente
            </h2>
            <span className="material-symbols-outlined text-[16px] text-slate-400">
              assignment
            </span>
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
                  Recibiste{" "}
                  <b className="text-emerald-700">2.1 XLM</b> de Solar Lima
                  Norte
                </p>
                <span className="text-slate-400">Hace 2h</span>
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
                  Compraste <b className="text-slate-900">5 tokens</b> en Solar
                  Arequipa
                </p>
                <span className="text-slate-400">Hace 1d</span>
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
                  Solar San Martín generó{" "}
                  <b className="text-slate-900">1,200 kWh</b>
                </p>
                <span className="text-slate-400">Hace 3d</span>
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
  signAndSend: (
    contractId: string,
    method: string,
    args: unknown[]
  ) => Promise<{ txHash: string; result?: unknown }>;
  connected: boolean;
  address?: string | null;
}) {
  const [claiming, setClaiming] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const { readContract } = useWallet();
  const [claimables, setClaimables] = useState<Record<number, string> | null>(null);
  const [totalClaimable, setTotalClaimable] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !address) {
      setClaimables(null);
      setTotalClaimable(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sdk = await import("@stellar/stellar-sdk");
        const decode = (val: unknown) => {
          try {
            return (sdk as unknown as { scValToNative: (v: unknown) => unknown }).scValToNative(val as never);
          } catch {
            return val;
          }
        };
        const ids = [1, 2, 3];
        const map: Record<number, string> = {};
        let total = BigInt(0);
        for (const pid of ids) {
          try {
            const raw = await readContract(CONTRACT_ID, "get_claimable", [address, pid]);
            const val = decode(raw);
            const bi = BigInt(val as string | number | bigint);
            total += bi;
            map[pid] = (Number(bi) / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 });
          } catch {
            map[pid] = "—";
          }
        }
        if (!cancelled) {
          setClaimables(map);
          setTotalClaimable((Number(total) / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }));
        }
      } catch (e) {
        console.warn("claimables fetch failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, address, readContract]);

  const handleClaimAll = async () => {
    if (!connected || !address) return;
    setClaiming(true);
    try {
      // contract: claim_revenue(investor: Address, project_id: u64) — demo uses 1
      const { txHash } = await signAndSend(CONTRACT_ID, "claim_revenue", [address, 1]);
      setLastTxHash(txHash);
    } catch (e) {
      console.error("Claim failed:", e);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimProject = async (projectId: number) => {
    if (!connected || !address) return;
    setClaiming(true);
    try {
      const normalized = projectId === 0 ? 1 : projectId;
      const { txHash } = await signAndSend(CONTRACT_ID, "claim_revenue", [
        address,
        normalized,
      ]);
      setLastTxHash(txHash);
    } catch (e) {
      console.error("Claim failed:", e);
    } finally {
      setClaiming(false);
    }
  };

  const displayTotal = connected && totalClaimable != null ? totalClaimable : "23.4";
  const isDemo = !connected || totalClaimable == null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[.18em] text-orange-600">
          Distribución de ingresos
        </p>
        <h1 className="text-3xl font-bold text-slate-900 font-display">
          Reclamar dividendos
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tus recompensas están listas para volver a tu wallet.
        </p>
      </div>

      {/* Total Card */}
      <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-6 relative">
        {isDemo && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700">
            DEMO • Testnet
          </span>
        )}
        <div className="text-sm text-slate-500">Total disponible</div>
        <div className="mt-2 font-mono text-4xl font-bold text-slate-900">
          {displayTotal}{" "}
          <span className="text-xl text-orange-600">XLM</span>
        </div>
        {!connected && (
          <p className="mt-2 text-xs text-amber-700">Conecta tu wallet para ver dividendos reales. Valor mostrado es simulado.</p>
        )}
        <button
          onClick={handleClaimAll}
          disabled={!connected || claiming}
          className="mt-6 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700 px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? (
            "Procesando..."
          ) : (
            <>
              Reclamar todo
              <span className="material-symbols-outlined text-[16px]">
                arrow_upward
              </span>
            </>
          )}
        </button>
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-md divide-y divide-slate-100">
        <div className="p-5 font-semibold text-slate-900 font-display">
          Desglose por proyecto
        </div>
        {projects.map((p) => {
          const pid = p.projectId === 0 ? 1 : p.projectId;
          const real = claimables?.[pid];
          const display = real != null ? real : p.dividends;
          const demoBadge = !connected || claimables == null;
          return (
            <div key={p.name} className="flex items-center justify-between p-5">
              <div>
                <div className="font-medium text-slate-700">{p.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {p.energy} kWh generados {demoBadge && <span className="ml-1 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px]">DEMO</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-600">
                  {display} XLM
                </span>
                <button
                  onClick={() => handleClaimProject(p.projectId)}
                  disabled={!connected || claiming}
                  className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Reclamar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Certificate after successful claim */}
      {lastTxHash && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-emerald-600 text-[24px]">
              check_circle
            </span>
            <div>
              <div className="font-semibold text-emerald-800">
                Transacción exitosa
              </div>
              <div className="text-xs text-emerald-600 font-mono">
                {lastTxHash.slice(0, 16)}...
              </div>
            </div>
          </div>
          <PdfCertificate
            data={{
              projectName: "NIKO SUN Dividendos",
              location: "Red Stellar Soroban",
              capacity: "Multi-proyecto",
              tokenAmount: "45",
              pricePaid: "23.4 XLM",
              walletAddress: "—",
              txHash: lastTxHash,
            }}
          />
        </div>
      )}
    </div>
  );
}

function MetricsView() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 font-display">
          Métricas
        </h1>
        <p className="mb-7 text-sm text-slate-500">
          Transparencia energética y financiera de la red NIKO SUN.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon="power"
          label="Energía generada"
          value="1.2M kWh"
          change="+18.4%"
          demo
        />
        <StatCard
          icon="payments"
          label="Revenue distribuido"
          value="340 XLM"
          change="+8.2%"
          demo
        />
        <StatCard
          icon="eco"
          label="CO₂ evitado"
          value="628 t"
          change="+14.1%"
          demo
        />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-md mt-5 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 font-display">
              Generación de energía
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Últimos 30 días — todos los proyectos
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

function AdminView() {
  const { signAndSend, connected, address } = useWallet();
  const [creating, setCreating] = useState(false);
  const [depositing, setDepositing] = useState<number | null>(null);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    supply: "",
    price: "",
    minPurchase: "",
  });

  const handleCreateProject = async () => {
    if (!connected || !address || !form.name) return;
    setCreating(true);
    try {
      await signAndSend(CONTRACT_ID, "create_project", [
        address,
        form.name,
        parseInt(form.supply) || 10000,
        parseInt(form.price) || 10,
        parseInt(form.minPurchase) || 1,
      ]);
      setForm({ name: "", supply: "", price: "", minPurchase: "" });
    } catch (e) {
      console.error("Create project failed:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleDepositRevenue = async (projectId: number) => {
    if (!connected || !address) return;
    setDepositing(projectId);
    try {
      // contract: deposit_revenue(depositor: Address, project_id: u64, amount: u128, energy_kwh_delta: u128)
      const amountStroops = BigInt(10) * BigInt(1_000_000); // 10 XLM in stroops
      const normalized = projectId === 0 ? 1 : projectId;
      await signAndSend(CONTRACT_ID, "deposit_revenue", [
        address,
        normalized,
        amountStroops,
        BigInt(0), // energy_kwh_delta — no IoT yet
      ]);
    } catch (e) {
      console.error("Deposit revenue failed:", e);
    } finally {
      setDepositing(null);
    }
  };

  const handleWithdrawSales = async (projectId: number) => {
    if (!connected || !address) return;
    setWithdrawing(projectId);
    try {
      // contract: withdraw_sales(caller: Address, project_id: u64, amount: u128)
      const amountStroops = BigInt(5) * BigInt(1_000_000); // 5 XLM in stroops
      const normalized = projectId === 0 ? 1 : projectId;
      await signAndSend(CONTRACT_ID, "withdraw_sales", [
        address,
        normalized,
        amountStroops,
      ]);
    } catch (e) {
      console.error("Withdraw sales failed:", e);
    } finally {
      setWithdrawing(null);
    }
  };

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
          Gestiona tus proyectos y distribuye revenue a holders.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon="wb_sunny" label="Tus proyectos" value="3" demo />
        <StatCard
          icon="payments"
          label="Total invertido"
          value="1,250 XLM"
          demo
        />
        <StatCard
          icon="bolt"
          label="Revenue depositado"
          value="340 XLM"
          demo
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
                className="mt-2 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ej. Solar Cusco Sur"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-500">
                Supply total
                <input
                  className="mt-2 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="10,000"
                  value={form.supply}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supply: e.target.value }))
                  }
                />
              </label>
              <label className="text-xs text-slate-500">
                Precio por token
                <input
                  className="mt-2 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="10 XLM"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="text-xs text-slate-500">
              Compra mínima
              <input
                className="mt-2 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="1 token"
                value={form.minPurchase}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minPurchase: e.target.value }))
                }
              />
            </label>
            <button
              onClick={handleCreateProject}
              disabled={!connected || creating}
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
          </div>
        </div>

        {/* Admin Project List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 font-display">
              Mis proyectos
            </h2>
            <button className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              Exportar
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <div className="font-medium text-slate-700">{p.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {p.capacity} — {p.progress}% vendido <span className="ml-1 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px]">DEMO</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDepositRevenue(p.projectId)}
                    disabled={!connected || depositing === p.projectId}
                    className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {depositing === p.projectId ? "..." : "Depositar"}
                  </button>
                  <button
                    onClick={() => handleWithdrawSales(p.projectId)}
                    disabled={!connected || withdrawing === p.projectId}
                    className="border border-amber-200 bg-white text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {withdrawing === p.projectId ? "..." : "Retirar"}
                  </button>
                  <button className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-[18px]">
                      more_horiz
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                    : connect()
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
            {view === "projects" && (
              <div>
                <h1 className="mb-2 text-3xl font-bold text-slate-900 font-display">
                  Mis proyectos
                </h1>
                <p className="mb-7 text-sm text-slate-500">
                  Explora oportunidades solares y sigue tu participación.
                </p>
                <div className="grid gap-4 lg:grid-cols-3">
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.name}
                      project={p}
                      onSelect={() => notify(`Abriendo ${p.name}`)}
                    />
                  ))}
                </div>
              </div>
            )}
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
