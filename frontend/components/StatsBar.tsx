"use client";

const stats = [
  { value: "42", unit: "", label: "kWh generados hoy", icon: "bolt", color: "text-tertiary" },
  { value: "720", unit: "kW", label: "Capacidad instalada", icon: "solar_power", color: "text-primary" },
  { value: "3", unit: "MW", label: "Energía total", icon: "energy", color: "text-secondary" },
  { value: "$12.4K", unit: "", label: "Capital total", icon: "account_balance", color: "text-primary" },
  { value: "6", unit: "%", label: "Tasa anual", icon: "trending_up", color: "text-primary" },
  { value: "89", unit: "", label: "Inversores activos", icon: "group", color: "text-secondary" },
];

export default function StatsBar() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <span
                  className={`material-symbols-rounded text-[20px] ${stat.color}`}
                >
                  {stat.icon}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-sm font-medium text-muted">
                    {stat.unit}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
