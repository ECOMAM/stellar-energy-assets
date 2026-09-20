"use client";

const projects = [
  {
    id: 1,
    name: "Solar Lima Norte",
    location: "Lima, Perú",
    flag: "🇵🇪",
    asset: "SUN-LIMA",
    apy: "12.5%",
    description:
      "Planta fotovoltaica en techo industrial con contrato PPA privado a 10 años firmado con distribuidora local.",
    capacity: "150 kWp",
    price: "10 XLM",
    funded: 85000,
    total: 100000,
    percent: 85,
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop",
  },
  {
    id: 2,
    name: "Solar Arequipa Desierto",
    location: "Arequipa, Perú",
    flag: "🇵🇪",
    asset: "SUN-AQP",
    apy: "14.2%",
    description:
      "Parque solar terrestre en zona de máxima irradiancia global con seguidores de eje simple y conexión a subestación.",
    capacity: "320 kWp",
    price: "15 XLM",
    funded: 124000,
    total: 200000,
    percent: 62,
    image:
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&h=400&fit=crop",
  },
  {
    id: 3,
    name: "Valle Sagrado Solar",
    location: "Cusco, Perú",
    flag: "🇵🇪",
    asset: "SUN-CUSCO",
    apy: "11.8%",
    description:
      "Microred comunitaria y eco-resort con respaldo de baterías LFP y tarifa fija indexada a la inflación energética.",
    capacity: "80 kWp",
    price: "5 XLM",
    funded: 75200,
    total: 80000,
    percent: 94,
    image:
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&h=400&fit=crop",
  },
];

function formatXLM(n: number) {
  return n.toLocaleString("en-US");
}

export default function FeaturedProjects() {
  return (
    <section
      id="projects"
      className="w-full max-w-7xl mx-auto px-5 lg:px-10 py-12"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-mono text-[11px] mb-2 uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Emisión Activa de Tokens</span>
          </div>
          <h2 className="font-display text-[24px] leading-[32px] lg:text-[40px] lg:leading-[48px] text-slate-900 font-bold">
            Proyectos Solares Destacados
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold shadow-sm hover:bg-emerald-700 transition-colors">
            Todos (12)
          </button>
          <button className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[13px] hover:text-slate-900 hover:border-slate-300 font-medium transition-colors">
            Perú (8)
          </button>
          <button className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[13px] hover:text-slate-900 hover:border-slate-300 font-medium transition-colors">
            Chile (4)
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-xl bg-white border border-slate-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px]"
          >
            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src={p.image}
                alt={`Solar panels at ${p.name}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* APY pill */}
              <div className="absolute top-4 right-4 px-4 py-1 rounded-full bg-white/95 border border-emerald-200 shadow-md flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span className="font-mono text-[12px] font-bold text-emerald-700">
                  {p.apy} APY
                </span>
              </div>

              {/* Asset pill */}
              <div className="absolute bottom-3 left-4 px-3 py-0.5 rounded bg-white/90 backdrop-blur-sm font-mono text-[11px] text-slate-700 font-semibold border border-white/40">
                ASSET: {p.asset}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-display text-slate-900 flex items-center gap-2 font-bold">
                    <span>{p.name}</span>
                    <span className="text-[16px]">{p.flag}</span>
                  </h3>
                </div>
                <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                  {p.description}
                </p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-2 gap-3 py-3 rounded-lg bg-slate-50 border border-slate-100 px-4">
                <div>
                  <span className="font-mono text-[11px] text-slate-500 block font-medium">
                    CAPACIDAD
                  </span>
                  <span className="font-mono text-[14px] text-slate-900 font-bold">
                    {p.capacity}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-slate-500 block font-medium">
                    PRECIO / TOKEN
                  </span>
                  <span className="font-mono text-[14px] text-orange-600 font-bold">
                    {p.price}
                  </span>
                </div>
              </div>

              {/* Funding progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center font-mono text-[12px]">
                  <span className="text-slate-600 font-medium">
                    Financiado: {formatXLM(p.funded)} / {formatXLM(p.total)} XLM
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {p.percent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <a
                href={`/project/${p.id}`}
                className="w-full h-11 rounded-lg bg-secondary text-white text-[13px] font-semibold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <span>Invertir Ahora</span>
                <span className="material-symbols-outlined text-[18px]">
                  bolt
                </span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
