"use client";

import { useState } from "react";
import { requestAccess, getAddress, isConnected } from "@stellar/freighter-api";

export default function WalletButton({
  wallet,
  onConnect,
}: {
  wallet: string | null;
  onConnect: (addr: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      if (wallet) {
        onConnect(null);
      } else {
        const result = await requestAccess();
        if (result.address) {
          onConnect(result.address);
        }
      }
    } catch (err) {
      console.error("Freighter error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (wallet) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
      >
        <span className="material-symbols-rounded text-[18px]">account_circle</span>
        {wallet.slice(0, 4)}...{wallet.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
    >
      <span className="material-symbols-rounded text-[18px]">wallet</span>
      {loading ? "Conectando..." : "Conectar Freighter"}
    </button>
  );
}
