"use client";

const metrics = [
  {
    label: "Total Tokenizado",
    value: "$2.4M+",
    sub: "En Activos Físicos Fotovoltaicos",
    subColor: "text-emerald-700",
    icon: "monetization_on",
    iconColor: "text-emerald-600",
  },
  {
    label: "Proyectos Activos",
    value: "12",
    sub: "Auditados y Conectados a Red",
    subColor: "text-orange-600",
    icon: "solar_power",
    iconColor: "text-orange-500",
  },
  {
    label: "Inversores Globales",
    value: "847",
    sub: "Cobrando Rendimientos Diarios",
    subColor: "text-amber-700",
    icon: "group",
    iconColor: "text-amber-600",
  },
  {
    label: "Energía Limpia",
    value: "1.2M",
    unit: "kWh",
    sub: "890 Toneladas CO₂ Evitadas",
    subColor: "text-emerald-700",
    icon: "eco",
    iconColor: "text-emerald-600",
  },
];

export default function StatsBar() {
  return (
    <section className="w-full max-w-7xl mx-auto px-5 lg:px-10 -mt-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="flex flex-col p-5 rounded-xl bg-white dark:bg-[#222a3d] border border-emerald-100 dark:border-[#0a3d22] shadow-md transition-all duration-300 hover:shadow-lg hover:border-emerald-200 dark:hover:border-[#4edea3]"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-[#86948a]">
              <span className="text-[13px] tracking-wide uppercase font-semibold text-slate-500 dark:text-[#86948a]">
                {m.label}
              </span>
              <span
                className={`material-symbols-outlined ${m.iconColor} text-[20px]`}
              >
                {m.icon}
              </span>
            </div>
            <span className="font-mono text-[20px] leading-[28px] lg:text-[40px] lg:leading-[48px] text-slate-900 dark:text-[#dae2fd] mt-3 font-bold tracking-tight">
              {m.value}
              {m.unit && (
                <span className="text-[20px] font-normal text-slate-500 dark:text-[#86948a]">
                  {" "}
                  {m.unit}
                </span>
              )}
            </span>
            <span
              className={`font-mono text-[11px] ${m.subColor} font-semibold mt-2`}
            >
              {m.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
