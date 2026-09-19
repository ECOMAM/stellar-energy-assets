import type { Metadata } from "next";
import { WalletProvider } from "@/lib/WalletContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIKO SUN — Solar Energy RWA on Stellar",
  description:
    "Tokenize solar energy projects. Invest in renewables on Stellar.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface font-body text-on-surface antialiased selection:bg-primary-fixed-dim selection:text-on-primary-fixed">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
