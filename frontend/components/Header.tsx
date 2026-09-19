"use client";

import { useState } from "react";
import WalletButton from "./WalletButton";
import WalletModal from "./WalletModal";

export default function Header({
  wallet,
  onConnect,
}: {
  wallet: string | null;
  onConnect: (addr: string | null) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="h-16 max-w-7xl mx-auto px-5 lg:px-10 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <span className="material-symbols-outlined text-[20px]">
                solar_power
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-display font-bold tracking-tight text-slate-900">
                NIKO SUN
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
                Stellar Clean Energy
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#projects"
              className="transition-colors py-2 px-3 bg-emerald-50 text-emerald-800 font-medium rounded-lg border border-emerald-200/60 text-[13px]"
            >
              Explorar
            </a>
            <a
              href="#how"
              className="text-slate-600 hover:text-emerald-700 transition-colors text-[13px] py-2 px-3 font-medium"
            >
              Cómo Funciona
            </a>
            <a
              href="#projects"
              className="text-slate-600 hover:text-emerald-700 transition-colors text-[13px] py-2 px-3 font-medium"
            >
              Proyectos
            </a>
            <a
              href="#tech"
              className="text-slate-600 hover:text-emerald-700 transition-colors text-[13px] py-2 px-3 font-medium"
            >
              Docs
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Testnet badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-mono text-[12px] text-slate-700 font-medium">
                Stellar Testnet
              </span>
            </div>

            <WalletButton
              wallet={wallet}
              onConnect={onConnect}
              onOpenModal={() => setModalOpen(true)}
            />
          </div>
        </div>
      </header>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={onConnect}
      />
    </>
  );
}
