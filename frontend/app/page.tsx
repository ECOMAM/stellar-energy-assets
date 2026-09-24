"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import ProtocolVerification from "@/components/ProtocolVerification";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProjects from "@/components/FeaturedProjects";
import TechArchitecture from "@/components/TechArchitecture";
import Footer from "@/components/Footer";
import { useHolderMetrics } from "@/hooks/useHolderMetrics";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ID } from "@/lib/contract";

function LandingVerification() {
  const { metrics } = useHolderMetrics();
  const { readContract } = useWallet();
  const [nextProjectId, setNextProjectId] = useState<number | null>(null);
  const [totalMinted, setTotalMinted] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = await import("@stellar/stellar-sdk");
        const decode = (val: unknown) => {
          try {
            return (sdk as unknown as { scValToNative: (v: unknown) => unknown }).scValToNative(val as never);
          } catch {
            return val;
          }
        };
        const rawNext = await readContract(CONTRACT_ID, "next_project_id", []);
        const d = decode(rawNext);
        let nid = 1;
        if (typeof d === "bigint") nid = Number(d);
        else if (typeof d === "number") nid = d;
        else if (d != null) nid = Number(d as string);
        if (cancelled) return;
        setNextProjectId(nid);

        // compute total minted across projects for verification panel
        const ids: number[] = [];
        for (let i = 1; i < nid; i++) ids.push(i);
        const fetchIds = ids.length > 0 ? ids.slice(0, 12) : [1];
        let total = BigInt(0);
        for (const id of fetchIds) {
          try {
            const raw = await readContract(CONTRACT_ID, "get_project", [id]);
            const p = decode(raw) as Record<string, unknown>;
            const minted = BigInt((p.minted ?? 0) as string | number | bigint);
            total += minted;
          } catch {
            // ignore
          }
        }
        if (!cancelled) setTotalMinted(total.toString());
      } catch {
        // leave null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readContract]);

  return <ProtocolVerification metrics={metrics} nextProjectId={nextProjectId} totalMinted={totalMinted} />;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <main className="w-full pt-16 bg-surface">
        <div className="flex flex-col w-full overflow-hidden">
          <Hero />
          <StatsBar />
          <LandingVerification />
          <HowItWorks />
          <FeaturedProjects />
          <TechArchitecture />
        </div>
      </main>
      <Footer />
    </div>
  );
}
