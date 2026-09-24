"use client";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import ProtocolVerification from "@/components/ProtocolVerification";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProjects from "@/components/FeaturedProjects";
import TechArchitecture from "@/components/TechArchitecture";
import Footer from "@/components/Footer";
import { useHolderMetrics } from "@/hooks/useHolderMetrics";
import { useOnChainProjects } from "@/hooks/useOnChainProjects";

function LandingVerification() {
  const { metrics } = useHolderMetrics();
  const { projects } = useOnChainProjects();
  const nextProjectId = projects ? (projects.length > 0 ? Math.max(...projects.map((p) => p.id)) + 1 : 1) : null;
  const totalMinted = projects ? projects.reduce((acc, p) => acc + p.minted, BigInt(0)).toString() : null;

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
