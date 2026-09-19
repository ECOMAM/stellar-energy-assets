"use client";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProjects from "@/components/FeaturedProjects";
import TechArchitecture from "@/components/TechArchitecture";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
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
