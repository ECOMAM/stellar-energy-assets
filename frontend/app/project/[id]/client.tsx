"use client";

import { useState } from "react";

const mockProject = {
  id: 1,
  name: "Solar Lima — Miraflores",
  location: "Lima, Perú",
  power: "720 kW",
  investors: 45,
  funding: 67,
  annualReturn: "6.2%",
  status: "Activo",
  irr: "8.4%",
  pricePerToken: "100 XLM",
  totalSupply: 1000,
  minted: 670,
  todayEnergy: 42.3,
  monthEnergy: 1280,
  co2Avoided: 1.82,
  uptime: 98.7,
  peakPower: 685,
  irradiance: 820,
  temperature: 31.2,
  humidity: 62,
};

export default function ProjectDetailClient() {
  const [activeTab, setActiveTab] = useState<"overview" | "iot" | "legal">(
    "overview"
  );
  const [purchaseAmount, setPurchaseAmount] = useState("10");
  const p = mockProject;
  const totalCost = parseInt(purchaseAmount || "0") * 100;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="h-16 max-w-7xl mx-auto px-5 lg:px-10 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Volver
          </a>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
              p.status === "Activo"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {p.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 lg:px-10 pt-24 pb-16">
        {/* Title */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-[13px] text-slate-500">
            <span className="material-symbols-outlined text-[16px]">
              location_on
            </span>
            {p.location}
          </div>
          <h1 className="mb-2 font-display text-[32px] font-bold text-slate-900">
            {p.name}
          </h1>
          <p className="text-[14px] text-slate-600">
            Proyecto de energía solar tokenizado en Stellar
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
              {[
                { key: "overview", label: "Resumen", icon: "info" },
                { key: "iot", label: "Telemetría IoT", icon: "sensors" },
                { key: "legal", label: "Estructura legal", icon: "gavel" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    {
                      icon: "bolt",
                      value: p.todayEnergy + " kWh",
                      label: "Generado hoy",
                      color: "text-amber-600",
                    },
                    {
                      icon: "solar_power",
                      value: p.power,
                      label: "Potencia",
                      color: "text-emerald-600",
                    },
                    {
                      icon: "group",
                      value: p.investors.toString(),
                      label: "Inversores",
                      color: "text-orange-600",
                    },
                    {
                      icon: "trending_up",
                      value: p.annualReturn,
                      label: "Retorno anual",
                      color: "text-emerald-600",
                    },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <span
                        className={`material-symbols-outlined mb-2 text-[20px] ${m.color}`}
                      >
                        {m.icon}
                      </span>
                      <div className="text-[16px] font-bold text-slate-900">
                        {m.value}
                      </div>
                      <div className="text-[12px] text-slate-500">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 flex justify-between">
                    <h3 className="font-bold text-slate-900">
                      Progreso de financiación
                    </h3>
                    <span className="text-[13px] font-bold text-emerald-600">
                      {p.funding}%
                    </span>
                  </div>
                  <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${p.funding}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-[13px]">
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.minted}
                      </div>
                      <div className="text-slate-500">Tokens vendidos</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.totalSupply - p.minted}
                      </div>
                      <div className="text-slate-500">Disponibles</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.totalSupply}
                      </div>
                      <div className="text-slate-500">Total</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-4 font-bold text-slate-900">
                    Distribución de dividendos
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        date: "Sep 2026",
                        energy: "1,280 kWh",
                        amount: "4,250 XLM",
                        status: "Depositado",
                      },
                      {
                        date: "Ago 2026",
                        energy: "1,140 kWh",
                        amount: "3,800 XLM",
                        status: "Depositado",
                      },
                      {
                        date: "Jul 2026",
                        energy: "980 kWh",
                        amount: "3,200 XLM",
                        status: "Reclamado",
                      },
                    ].map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-4 py-3"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {d.date}
                          </div>
                          <div className="text-[12px] text-slate-500">
                            {d.energy}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">
                            {d.amount}
                          </div>
                          <div className="text-[12px] text-slate-500">
                            {d.status}
                          </div>
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
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-4 font-bold text-slate-900">
                    Telemetría en tiempo real
                  </h3>
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
                      <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                        <span className="material-symbols-outlined mb-1 text-[18px] text-emerald-600">{m.icon}</span>
                        <div className="text-[13px] font-bold text-slate-900">{m.value}</div>
                        <div className="text-[11px] text-slate-500">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-4 font-bold text-slate-900">
                    Generación energética
                  </h3>
                  <div className="flex h-48 items-end gap-2">
                    {[35, 42, 38, 51, 47, 44, 39, 45, 48, 52, 41, 46].map(
                      (v, i) => (
                        <div
                          key={i}
                          className="chart-bar flex-1 rounded-t bg-emerald-600"
                          style={{ height: `${(v / 60) * 100}%` }}
                        />
                      )
                    )}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                    <span>Ene</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Abr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Ago</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dic</span>
                  </div>
                </div>
              </div>
            )}

            {/* Legal tab */}
            {activeTab === "legal" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-4 font-bold text-slate-900">
                    Estructura RWA
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        icon: "business",
                        title: "SPV: NIKO SUN Energy SAC",
                        desc: "Vehicle de propósito especial",
                      },
                      {
                        icon: "description",
                        title: "Contrato de usufructo",
                        desc: "Derechos de energía sobre paneles solares",
                      },
                      {
                        icon: "token",
                        title: "Tokens SEP-41 en Stellar",
                        desc: "Representación fraccionada de la propiedad",
                      },
                      {
                        icon: "gavel",
                        title: "Regulación: SMI Perú",
                        desc: "Supervisado por Superintendencia del Mercado de Valores",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-100 p-4"
                      >
                        <span className="material-symbols-outlined mt-0.5 text-[20px] text-emerald-600">
                          {item.icon}
                        </span>
                        <div>
                          <div className="font-medium text-slate-900">
                            {item.title}
                          </div>
                          <div className="text-[13px] text-slate-500">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column: Purchase sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-[18px] font-bold text-slate-900">
                Invertir en este proyecto
              </h3>
              <div className="mb-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                <div className="mb-1 text-[12px] text-slate-500">
                  Precio por token
                </div>
                <div className="text-[24px] font-bold text-slate-900 font-mono">
                  {p.pricePerToken}
                </div>
                <div className="text-[12px] text-slate-500">
                  ≈ $5.40 USD
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-[13px] font-medium text-slate-900">
                  Cantidad de tokens
                </label>
                <input
                  type="number"
                  min="1"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[24px] font-bold text-slate-900 font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="mb-6 space-y-2 rounded-xl bg-slate-50 border border-slate-100 p-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total a pagar</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {totalCost} XLM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Retorno anual estimado
                  </span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {p.annualReturn}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Retorno IRR</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {p.irr}
                  </span>
                </div>
              </div>
              <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-[13px] font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-xl">
                <span className="material-symbols-outlined text-[18px]">
                  token
                </span>
                Comprar Tokens
              </button>
              <div className="text-center text-[12px] text-slate-500">
                Transacción firmada con Freighter
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
