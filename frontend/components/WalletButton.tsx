"use client";

import { useState } from "react";
import { requestAccess } from "@stellar/freighter-api";

export default function WalletButton({
  wallet,
  onConnect,
  onOpenModal,
}: {
  wallet: string | null;
  onConnect: (addr: string | null) => void;
  onOpenModal: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (wallet) {
      onConnect(null);
      return;
    }
    setLoading(true);
    try {
      const result = await requestAccess();
      if (result.address) {
        onConnect(result.address);
      }
    } catch (err) {
      console.error("Freighter error:", err);
      onOpenModal();
    } finally {
      setLoading(false);
    }
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleConnect}
          className="h-10 px-5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13px] font-semibold shadow-sm transition-all hover:bg-emerald-100 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            account_circle
          </span>
          {wallet.slice(0, 4)}...{wallet.slice(-4)}
        </button>
        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-emerald-700 text-[18px]">
            person
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="h-10 px-6 rounded-lg bg-secondary text-white text-[13px] font-semibold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
    >
      <span>{loading ? "Conectando..." : "Conectar Wallet"}</span>
      <span className="material-symbols-outlined text-[18px]">
        account_balance_wallet
      </span>
    </button>
  );
}
