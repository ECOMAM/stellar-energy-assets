"use client";

import { useState } from "react";
import WalletButton from "./WalletButton";

export default function Header({
  wallet,
  onConnect,
}: {
  wallet: string | null;
  onConnect: (addr: string | null) => void;
}) {
  return (
    <header className="glass sticky top-0 z-50 border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <span className="material-symbols-rounded text-[20px]">
              solar_power
            </span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            NIKO <span className="text-primary">SUN</span>
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "Explorar", href: "#projects" },
            { label: "Cómo funciona", href: "#how" },
            {label: "Arquitectura", href: "#tech" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-dim hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Wallet */}
        <WalletButton wallet={wallet} onConnect={onConnect} />
      </div>
    </header>
  );
}
