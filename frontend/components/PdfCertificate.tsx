"use client";

import { useCallback } from "react";
import jsPDF from "jspdf";

interface CertificateData {
  projectName: string;
  location: string;
  capacity: string;
  tokenAmount: string;
  pricePaid: string;
  walletAddress: string;
  txHash?: string;
  date?: string;
}

/**
 * Generate a professional Solar Tokenization Certificate as PDF.
 * Uses jsPDF directly (no html2canvas needed).
 */
export default function PdfCertificate({ data }: { data: CertificateData }) {
  const generate = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const dateStr = data.date || new Date().toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // ── Background ──
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, w, h, "F");

    // ── Top emerald accent bar ──
    doc.setFillColor(5, 150, 105); // #059669
    doc.rect(0, 0, w, 8, "F");

    // ── Inner accent line ──
    doc.setFillColor(217, 119, 6); // #d97706 (amber)
    doc.rect(0, 8, w, 1.5, "F");

    // ── NIKO SUN Logo area ──
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(25, 20, 160, 30, 4, 4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("NIKOSUN", w / 2 - 42, 33, { align: "left" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RWA SOLAR", w / 2 + 10, 33, { align: "left" });

    doc.setFontSize(7);
    doc.text("Powered by Stellar Soroban", w / 2, 43, { align: "center" });

    // ── Title ──
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Certificado de Tokenización Solar", w / 2, 68, { align: "center" });

    // ── Subtitle line ──
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.8);
    doc.line(w / 2 - 45, 72, w / 2 + 45, 72);

    // ── Certificate body ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // slate-500
    doc.text("Este certificado acredita la tenencia de tokens solares RWA en la", w / 2, 82, { align: "center" });
    doc.text("red Stellar Soroban, respaldado por infraestructura solar real.", w / 2, 88, { align: "center" });

    // ── Info cards ──
    const cardY = 98;
    const cardH = 52;

    // Left card - Project Info
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(20, cardY, 80, cardH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text("PROYECTO", 28, cardY + 10);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(data.projectName, 28, cardY + 18);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ubicación: ${data.location}`, 28, cardY + 27);
    doc.text(`Capacidad: ${data.capacity}`, 28, cardY + 34);
    doc.text(`Fecha: ${dateStr}`, 28, cardY + 41);

    // Right card - Token Info
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(110, cardY, 80, cardH, 3, 3, "FD");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(110, cardY, 80, cardH, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(234, 88, 12); // orange
    doc.text("TOKENIZACIÓN", 118, cardY + 10);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${data.tokenAmount} Tokens`, 118, cardY + 18);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Precio: ${data.pricePaid}`, 118, cardY + 27);
    doc.text(`Red: Stellar Testnet`, 118, cardY + 34);

    // Wallet truncated
    const truncatedAddr = data.walletAddress.length > 20
      ? `${data.walletAddress.slice(0, 8)}...${data.walletAddress.slice(-6)}`
      : data.walletAddress;
    doc.text(`Wallet: ${truncatedAddr}`, 118, cardY + 41);

    // ── QR Code area ──
    const qrY = cardY + cardH + 12;
    if (data.txHash) {
      // Simple QR box with tx hash reference
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(w / 2 - 25, qrY, 50, 50, 3, 3, "F");

      // Draw a simple QR placeholder pattern
      doc.setFillColor(15, 23, 42);
      const qrX = w / 2 - 18;
      const qrStartY = qrY + 5;
      const cellSize = 2.5;
      // Simple deterministic pattern based on tx hash
      const hash = data.txHash;
      for (let row = 0; row < 14; row++) {
        for (let col = 0; col < 14; col++) {
          const idx = (row * 14 + col) % hash.length;
          const charCode = hash.charCodeAt(idx);
          if (charCode % 3 !== 0 || (row < 3 && col < 3) || (row < 3 && col > 10) || (row > 10 && col < 3)) {
            doc.rect(qrX + col * cellSize, qrStartY + row * cellSize, cellSize, cellSize, "F");
          }
        }
      }

      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("Verificar en Stellar Expert", w / 2, qrY + 46, { align: "center" });
    }

    // ── Footer ──
    doc.setFillColor(5, 150, 105);
    doc.rect(0, h - 20, w, 20, "F");

    doc.setFillColor(217, 119, 6);
    doc.rect(0, h - 20, w, 1, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Built on Stellar Soroban", w / 2, h - 12, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("NIKOSUN RWA Solar — Certificado generado automáticamente", w / 2, h - 7, { align: "center" });

    // ── Save ──
    const fileName = `NikoSun_Certificado_${data.projectName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    doc.save(fileName);
  }, [data]);

  return (
    <button
      onClick={generate}
      className="inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      Descargar Certificado
    </button>
  );
}
