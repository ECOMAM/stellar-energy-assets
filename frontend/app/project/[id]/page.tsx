"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

// Mock project data — in production, fetch from contract
const mockProject = {
  id: 1,
  name: "Solar Lima — Miraflores",
  location: "Lima, Perú",
  lat: -12.1211,
  lng: -77.0295,
  power: "720 kW",
  panels: 180,
  efficiency: "21.3%",
  investors: 45,
  funding: 67,
  annualReturn: "6.2%",
  status: "Activo",
  irr: "8.4%",
  payback: "6.2 años",
  pricePerToken: "100 XLM",
  totalSupply: 1000,
  minted: 670,
  totalRevenue: "12,450 XLM",
  totalClaimed: "8,200 XLM",
  totalEnergy: "3,420 kWh",
  // IoT telemetry
  todayEnergy: 42.3,
  monthEnergy: 1280,
  co2Avoided: 1.82,
  uptime: 98.7,
  peakPower: 685,
  irradiance: 820,
  temperature: 31.2,
  humidity: 62,
};

export default function ProjectDetail() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<"overview" | "iot" | "legal">("overview");
  const [purchaseAmount, setPurchaseAmount] = useState("10");

  const p = mockProject;
  const totalCost = parseInt(purchaseAmount || "0") * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
            <span className="material-symbols-rounded text-[18px]">arrow_back</span>
            Volver
          </a>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              p.status === "Activo" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {p.status}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Project title */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <span className="material-symbols-rounded text-[16px]">location_on</span>
            {p.location}
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">{p.name}</h1>
          <p className="text-muted">Proyecto de energía solar tokenizado en Stellar</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column — tabs */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl bg-surface-dim p-1">
              {[
                { key: "overview", label: "Resumen", icon: "info" },
                { key: "iot", label: "Telemetría IoT", icon: "sensors" },
                { key: "legal", label: "Estructura legal", icon: "gavel" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="material-symbols-rounded text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { icon: "bolt", value: p.todayEnergy + " kWh", label: "Generado hoy", color: "text-tertiary" },
                    { icon: "solar_power", value: p.power, label: "Potencia", color: "text-primary" },
                    { icon: "group", value: p.investors.toString(), label: "Inversores", color: "text-secondary" },
                    { icon: "trending_up", value: p.annualReturn, label: "Retorno anual", color: "text-primary" },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl border border-border bg-surface p-4">
                      <span className={`material-symbols-rounded mb-2 text-[20px] ${m.color}`}>{m.icon}</span>
                      <div className="text-lg font-bold text-foreground">{m.value}</div>
                      <div className="text-xs text-muted">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Funding progress */}
                <div className="rounded-xl border border-border bg-surface p-6">
                  <div className="mb-4 flex justify-between">
                    <h3 className="font-bold text-foreground">Progreso de financiación</h3>
                    <span className="text-sm font-bold text-primary">{p.funding}%</span>
                  </div>
                  <div className="mb-4 h-3 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                      style={{ width: `${p.funding}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="font-bold text-foreground">{p.minted}</div>
                      <div className="text-muted">Tokens vendidos</div>
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{p.totalSupply - p.minted}</div>
                      <div className="text-muted">Disponibles</div>
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{p.totalSupply}</div>
                      <div className="text-muted">Total</div>
                    </div>
                  </div>
                </div>

                {/* Dividend history */}
                <div className="rounded-xl border border-border bg-surface p-6">
                  <h3 className="mb-4 font-bold text-foreground">Distribución de dividendos</h3>
                  <div className="space-y-3">
                    {[
                      { date: "Sep 2026", energy: "1,280 kWh", amount: "4,250 XLM", status: "Depositado" },
                      { date: "Ago 2026", energy: "1,140 kWh", amount: "3,800 XLM", status: "Depositado" },
                      { date: "Jul 2026", energy: "980 kWh", amount: "3,200 XLM", status: "Reclamado" },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-surface-dim px-4 py-3">
                        <div>
                          <div className="font-medium text-foreground">{d.date}</div>
                          <div className="text-xs text-muted">{d.energy}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{d.amount}</div>
                          <div className="text-xs text-muted">{d.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* IoT tab */}
            {activeTab === "iot" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-surface p-6">
                  <h3 className="mb-4 font-bold text-foreground">Telemetría en tiempo real</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { icon: "bolt", value: p.todayEnergy + " kWh", label: "Generado hoy" },
                      { icon: "calendar_month", value: p.monthEnergy.toLocaleString() + " kWh", label: "Este mes" },
                      { icon: "eco", value: p.co2Avoided + " ton", label: "CO₂ evitado" },
                      { icon: "check_circle", value: p.uptime + "%", label: "Uptime" },
                      { icon: "power", value: p.peakPower + " W", label: "Pico" },
                      { icon: "wb_sunny", value: p.irradiance + " W/m²", label: "Irradiancia" },
                      { icon: "thermostat", value: p.temperature + "°C", label: "Temperatura" },
                      { icon: "water_drop", value: p.humidity + "%", label: "Humedad" },
                    ].map((m, i) => (
                      <div key={i} className="rounded-lg bg-surface-dim p-3 text-center">
                        <span className="material-symbols-rounded mb-1 text-[18px] text-primary">{m.icon}</span>
                        <div className="text-sm font-bold text-foreground">{m.value}</div>
                        <div className="text-xs text-muted">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Energy chart placeholder */}
                <div className="rounded-xl border border-border bg-surface p-6">
                  <h3 className="mb-4 font-bold text-foreground">Generación energética</h3>
                  <div className="flex h-48 items-end gap-2">
                    {[35, 42, 38, 51, 47, 44, 39, 45, 48, 52, 41, 46].map((v, i) => (
                      <div
                        key={i}
                        className="chart-bar flex-1 rounded-t bg-gradient-to-t from-primary to-primary-light"
                        style={{ height: `${(v / 60) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
                    <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
                  </div>
                </div>
              </div>
            )}

            {/* Legal tab */}
            {activeTab === "legal" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-surface p-6">
                  <h3 className="mb-4 font-bold text-foreground">Estructura RWA</h3>
                  <div className="space-y-4">
                    {[
                      { icon: "business", title: "SPV: NIKO SUN Energy SAC", desc: "Vehicle de propósito especial" },
                      { icon: "description", title: "Contrato de usufructo", desc: "Derechos de energía sobre paneles solares" },
                      { icon: "token", title: "Tokens SEP-41 en Stellar", desc: "Representación fraccionada de la propiedad" },
                      { icon: "gavel", title: "Regulación: SMI Perú", desc: "Supervisado por Superintendencia del Mercado de Valores" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-surface-dim p-4">
                        <span className="material-symbols-rounded mt-0.5 text-[20px] text-primary">{item.icon}</span>
                        <div>
                          <div className="font-medium text-foreground">{item.title}</div>
                          <div className="text-sm text-muted">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column — purchase widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-surface p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-foreground">Invertir en este proyecto</h3>

              <div className="mb-4 rounded-xl bg-surface-dim p-4">
                <div className="mb-1 text-xs text-muted">Precio por token</div>
                <div className="text-2xl font-bold text-foreground">{p.pricePerToken}</div>
                <div className="text-xs text-muted">≈ $5.40 USD</div>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Cantidad de tokens
                </label>
                <input
                  type="number"
                  min="1"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-dim px-4 py-3 text-2xl font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mb-6 space-y-2 rounded-xl bg-surface-dim p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Total a pagar</span>
                  <span className="font-bold text-foreground">{totalCost} XLM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Retorno anual estimado</span>
                  <span className="font-bold text-primary">{p.annualReturn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Retorno IRR</span>
                  <span className="font-bold text-primary">{p.irr}</span>
                </div>
              </div>

              <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-xl hover:shadow-primary/30">
                <span className="material-symbols-rounded text-[18px]">token</span>
                Comprar Tokens
              </button>

              <div className="text-center text-xs text-muted">
                Transacción firmada con Freighter
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
