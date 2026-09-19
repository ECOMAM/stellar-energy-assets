"use client";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <span className="material-symbols-rounded text-[18px]">
                  solar_power
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">
                NIKO <span className="text-primary">SUN</span>
              </span>
            </div>
            <p className="text-sm text-muted">
              Tokenización de energía solar en Stellar.
            </p>
          </div>

          {/* Links */}
          {[
            {
              title: "Plataforma",
              links: ["Explorar Proyectos", "Cómo funciona", "Documentación"],
            },
            {
              title: "Comunidad",
              links: ["Discord", "Twitter/X", "GitHub"],
            },
            {
              title: "Legal",
              links: ["Términos", "Privacidad", "Aviso de riesgos"],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
          Built for Stellar Odyssey Perú 2026. NIKO SUN &copy; 2026
        </div>
      </div>
    </footer>
  );
}
