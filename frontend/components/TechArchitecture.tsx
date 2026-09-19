"use client";

const layers = [
  {
    icon: "devices",
    title: "Frontend",
    desc: "Next.js + Stellar SDK + Freighter",
    color: "border-primary/30 bg-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: "security",
    title: "Smart Contract",
    desc: "Soroban (Rust) — Token RWA",
    color: "border-secondary/30 bg-secondary/5",
    iconColor: "text-secondary",
  },
  {
    icon: "cloud",
    title: "IoT Telemetry",
    desc: "Data feed on-chain via oracles",
    color: "border-tertiary/30 bg-tertiary/5",
    iconColor: "text-tertiary",
  },
  {
    icon: "account_balance",
    title: "Stellar Network",
    desc: "Low fees, fast settlement, SEP-41",
    color: "border-primary/30 bg-primary/5",
    iconColor: "text-primary",
  },
];

export default function TechArchitecture() {
  return (
    <section id="tech" className="bg-surface-dim py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Arquitectura Técnica
          </h2>
          <p className="text-muted">
            Construido sobre Stellar con contratos Soroban
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {layers.map((layer, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 text-center transition-all hover:shadow-lg ${layer.color}`}
            >
              <span
                className={`material-symbols-rounded mb-3 text-[32px] ${layer.iconColor}`}
              >
                {layer.icon}
              </span>
              <h3 className="mb-1 font-bold text-foreground">{layer.title}</h3>
              <p className="text-sm text-muted">{layer.desc}</p>
            </div>
          ))}
        </div>

        {/* Code snippet */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border bg-surface-dim px-4 py-2">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-muted">
              contracts/niko_project/src/lib.rs
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground">
            <code>{`pub fn purchase_tokens(
    env: Env,
    buyer: Address,
    project_id: u64,
    amount: u128,
    payment: u128,
) {
    buyer.require_auth();
    // ... validates, mints tokens, records sale
    let total_price = project.price * amount;
    assert!(payment >= total_price);
    project.minted += amount;
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
