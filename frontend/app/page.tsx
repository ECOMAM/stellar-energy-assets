"use client";

import { useState, useEffect } from "react";
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
    <div className="min-h-screen bg-background">
      <Header wallet={wallet} onConnect={setWallet} />
      <main>
        <Hero />
        <StatsBar />
        <HowItWorks />
        <FeaturedProjects />
        <TechArchitecture />
      </main>
      <Footer />
    </div>
  );
}
