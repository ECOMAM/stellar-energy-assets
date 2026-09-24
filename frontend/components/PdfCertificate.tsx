"use client";

import { useCallback } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface CertificateData {
  projectName: string;
  location: string;
  capacity: string;
  tokenAmount: string;
  pricePaid: string;
  walletAddress: string;
  txHash?: string;
  date?: string;
  flag?: string;
}

/**
 * Generate a professional Solar Usufruct Certificate (CERTIFICADO DE USUFRUCTO SOLAR RWA)
 * as a legal/financial PDF document. Uses jsPDF directly + qrcode library for real QR codes.
 */
export default function PdfCertificate({ data }: { data: CertificateData }) {
  const generate = useCallback(async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const dateStr =
      data.date ||
      new Date().toLocaleDateString("es-PE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const usufId = `SLN-USUF-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
    const truncatedAddr =
      data.walletAddress.length > 16
        ? `${data.walletAddress.slice(0, 8)}...${data.walletAddress.slice(-4)}`
        : data.walletAddress;

    // Colors
    const emerald = [5, 150, 105] as const;
    const orange = [234, 88, 12] as const;
    const amber = [217, 119, 6] as const;
    const slate900 = [15, 23, 42] as const;
    const slate700 = [51, 65, 85] as const;
    const slate500 = [100, 116, 139] as const;
    const slate300 = [203, 213, 225] as const;
    const slate200 = [226, 232, 240] as const;
    const white = [255, 255, 255] as const;
    const slate50 = [248, 250, 252] as const;

    // ── Background ──
    doc.setFillColor(...slate50);
    doc.rect(0, 0, w, h, "F");

    // ── Top emerald accent bar (4mm) ──
    doc.setFillColor(...emerald);
    doc.rect(0, 0, w, 4, "F");

    // ── Amber thin line (1mm) ──
    doc.setFillColor(...amber);
    doc.rect(0, 4, w, 1, "F");

    // ── Header section ──
    let y = 14;

    // Left: NIKOSUN + badge + powered by
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...slate900);
    doc.text("NIKOSUN", 20, y);

    // RWA SOLAR badge
    doc.setFillColor(...emerald);
    doc.roundedRect(57, y - 5, 22, 6, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text("RWA SOLAR", 68, y - 1.2, { align: "center" });

    // Powered by Stellar Soroban
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate500);
    doc.text("Powered by Stellar Soroban", 20, y + 5);

    // Right: workspace_premium Título Digital Desmaterializado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...orange);
    doc.text("Título Digital Desmaterializado", w - 20, y - 2, { align: "right" });

    // Right: material icon substitute (star icon text)
    doc.setFontSize(6);
    doc.setTextColor(...slate500);
    doc.text("workspace_premium", w - 20, y + 3, { align: "right" });

    y += 14;

    // ── Main title ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...slate900);
    doc.text("CERTIFICADO DE USUFRUCTO SOLAR RWA", w / 2, y, { align: "center" });

    y += 6;

    // ── Subtitle: legal reference ──
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text("Ley General de Sociedades N° 26887 & D.L. 1023", w / 2, y, {
      align: "center",
    });

    y += 5;

    // ── NFT ID right-aligned ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...amber);
    doc.text(`NFT #${usufId}`, w - 20, y, { align: "right" });

    y += 3;

    // ── Separator line ──
    doc.setDrawColor(...emerald);
    doc.setLineWidth(0.6);
    doc.line(20, y, w - 20, y);

    y += 8;

    // ── Two-column grid ──
    const colLeftX = 20;
    const colRightX = w / 2 + 5;
    const colWidth = w / 2 - 25;

    // ── LEFT COLUMN: Activo Subyacente ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...slate500);
    doc.text("ACTIVO SUBYACENTE", colLeftX, y);

    y += 5;

    // Flag + project name
    const flagPrefix = data.flag ? `${data.flag} ` : "";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...slate900);
    doc.text(`${flagPrefix}${data.projectName}`, colLeftX, y);

    y += 5;

    // Location
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate500);
    doc.text(`📍 ${data.location}`, colLeftX, y);

    y += 6;

    // ACTIVO REAL badge
    doc.setFillColor(...emerald);
    doc.roundedRect(colLeftX, y - 3.5, 24, 5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text("ACTIVO REAL", colLeftX + 12, y - 0.2, { align: "center" });

    // ── RIGHT COLUMN: Legal metadata ──
    let rightY = y - 12;

    const rightFields = [
      { label: "Fideicomitente / Emisor", value: "La Fiduciaria S.A. / NIKO Protocol" },
      { label: "Inscripción Registral", value: "SUNARP N° 14829104" },
      { label: "Potencia Adjudicada", value: data.capacity || "—" },
      { label: "Vigencia del Usufructo", value: "10 Años (PPA Indexado USD)" },
      { label: "Titular Registrado", value: truncatedAddr },
      { label: "Estándar Soroban", value: "SEP-41 Non-Fungible RWA" },
    ];

    for (const field of rightFields) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...slate500);
      doc.text(field.label.toUpperCase(), colRightX, rightY);

      rightY += 3.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...slate900);
      doc.text(field.value, colRightX, rightY);

      rightY += 5;
    }

    y += 12;

    // ── PATRIMONIO AUTÓNOMO section ──
    const paY = Math.max(y, rightY + 2);

    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(20, paY, w - 40, 16, 2, 2, "F");

    // Policy icon circle
    doc.setFillColor(...amber);
    doc.circle(30, paY + 8, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text("P", 30, paY + 9.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...amber);
    doc.text("PATRIMONIO AUTÓNOMO", 38, paY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...slate500);
    doc.text("Inembargable y auditado trimestralmente", 38, paY + 12);

    y = paY + 22;

    // ── QR Code section ──
    const qrCenterX = w / 2;
    const qrSize = 30;

    if (data.txHash) {
      const qrUrl = `https://stellar.expert/testnet/tx/${data.txHash}`;

      try {
        // Generate REAL QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 300,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        // Add QR image centered
        doc.addImage(qrDataUrl, "PNG", qrCenterX - qrSize / 2, y, qrSize, qrSize);

        // "Validar On-Chain" text below QR
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...slate700);
        doc.text("Validar On-Chain", qrCenterX, y + qrSize + 5, { align: "center" });

        // Tx hash in small monospace below
        doc.setFont("courier", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...slate500);
        doc.text(data.txHash, qrCenterX, y + qrSize + 9, { align: "center" });
      } catch {
        // Fallback: placeholder if QR generation fails
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(qrCenterX - qrSize / 2, y, qrSize, qrSize, 2, 2, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...slate500);
        doc.text("QR Code", qrCenterX, y + qrSize / 2, { align: "center" });
      }
    }

    // ── Footer ──
    const footerY = h - 16;

    // Emerald bar
    doc.setFillColor(...emerald);
    doc.rect(0, footerY, w, 16, "F");

    // Amber line at top of footer
    doc.setFillColor(...amber);
    doc.rect(0, footerY, w, 1, "F");

    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Built on Stellar Soroban", w / 2, footerY + 8, { align: "center" });

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      "NIKOSUN RWA Solar — Certificado generado automáticamente",
      w / 2,
      footerY + 12.5,
      { align: "center" }
    );

    // ── Save ──
    const fileName = `NikoSun_Certificado_${data.projectName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    doc.save(fileName);
  }, [data]);

  return (
    <button
      onClick={() => generate()}
      className="inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      Descargar Certificado
    </button>
  );
}
