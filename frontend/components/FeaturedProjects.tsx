"use client";

const projects = [
  {
    id: 1,
    name: "Solar Lima — Miraflores",
    location: "Lima, Perú",
    power: "720 kW",
    investors: 45,
    funding: 67,
    annualReturn: "6.2%",
    status: "Activo",
    image: "☀️",
  },
  {
    id: 2,
    name: "Solar Cusco — Valle Sagrado",
    location: "Cusco, Perú",
    power: "340 kW",
    investors: 28,
    funding: 42,
    annualReturn: "5.8%",
    status: "Activo",
    image: "🏔️",
  },
  {
    id: 3,
    name: "Solar Arequipa — Cayma",
    location: "Arequipa, Perú",
    power: "1.2 MW",
    investors: 16,
    funding: 23,
    annualReturn: "7.1%",
    status: "En financiación",
    image: "🌞",
  },
];

export default function FeaturedProjects() {
  return (
    <section id="projects" className="bg-surface py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Proyectos Destacados
            </h2>
            <p className="text-muted">
              Energía solar real, rendimientos reales
            </p>
          </div>
          <a
            href="#"
            className="hidden items-center gap-1 text-sm font-semibold text-primary hover:text-primary-light sm:flex"
          >
            Ver todos
            <span className="material-symbols-rounded text-[18px]">
              arrow_forward
            </span>
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/project/${p.id}`}
              className="group block rounded-2xl border border-border bg-surface p-6 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
            >
              {/* Image placeholder */}
              <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-primary/5 to-tertiary/5 text-6xl">
                {p.image}
              </div>

              {/* Status badge */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === "Activo"
                      ? "bg-primary/10 text-primary"
                      : "bg-tertiary/10 text-tertiary"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {p.status}
                </span>
                <span className="text-xs text-muted">{p.location}</span>
              </div>

              <h3 className="mb-3 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {p.name}
              </h3>

              {/* Metrics grid */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Potencia", value: p.power },
                  { label: "Retorno", value: p.annualReturn },
                  { label: "Inversores", value: p.investors.toString() },
                  { label: "Financiado", value: `${p.funding}%` },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-xs text-muted">{m.label}</div>
                    <div className="font-bold text-foreground">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Funding progress */}
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">Progreso de financiación</span>
                  <span className="font-semibold text-foreground">
                    {p.funding}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all"
                    style={{ width: `${p.funding}%` }}
                  />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
