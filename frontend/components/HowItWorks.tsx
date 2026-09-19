"use client";

const steps = [
  {
    icon: "account_balance_wallet",
    title: "Conecta tu wallet",
    description: "Instala Freighter y conecta tu wallet de Stellar en segundos.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: "search",
    title: "Explora proyectos",
    description: "Revisa proyectos solares con datos IoT en tiempo real.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: "token",
    title: "Invierte tokens",
    description: "Compra tokens de energía solar con XLM a precio fijo.",
    color: "bg-tertiary/10 text-tertiary",
  },
  {
    icon: "trending_up",
    title: "Recibe rendimientos",
    description: "Cobra dividendos proporcionales cada vez que se deposita revenue.",
    color: "bg-primary/10 text-primary",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-surface-dim py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Cómo funciona
          </h2>
          <p className="text-muted">
            De la energía solar a rendimientos on-chain en 4 pasos
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${step.color}`}
              >
                <span className="material-symbols-rounded text-[22px]">
                  {step.icon}
                </span>
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                Paso {i + 1}
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
