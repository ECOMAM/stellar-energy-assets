"use client";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur">
            <span className="material-symbols-rounded text-[16px]">bolt</span>
            Stellar Odyssey Perú 2026
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Tokeniza tu energía
            <br />
            <span className="text-tertiary-light">solar</span> en Stellar
          </h1>

          <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/80">
            Invierte en proyectos solares reales. Recibe rendimientos
            proporcionales por la energía generada. Todo on-chain en Stellar.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-primary-dark shadow-lg transition-all hover:shadow-xl hover:bg-white/90"
            >
              <span className="material-symbols-rounded text-[18px]">
                explore
              </span>
              Explorar Proyectos
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/20"
            >
              <span className="material-symbols-rounded text-[18px]">
                play_circle
              </span>
              Cómo funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
