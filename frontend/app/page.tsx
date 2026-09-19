"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProjects from "@/components/FeaturedProjects";
import TechArchitecture from "@/components/TechArchitecture";
import Footer from "@/components/Footer";

export default function Home() {
  const [wallet, setWallet] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-surface">
      <Header wallet={wallet} onConnect={setWallet} />
      <main className="w-full pt-16 bg-surface">
        <div className="flex flex-col w-full overflow-hidden">
          <Hero />
          <StatsBar />
          <HowItWorks />
          <FeaturedProjects />
          <TechArchitecture />
        </div>
      </main>
      <Footer />
    </div>
  );
}
