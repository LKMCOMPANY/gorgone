"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { ReportWithZone } from "@/types";

interface PDFExportOptions {
  report: ReportWithZone;
  contentElement: HTMLElement;
}

// Gorgone logo as base64 (simplified eye shape for PDF)
const GORGONE_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjgiIGZpbGw9IiMwMDAiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMyIgZmlsbD0iI2ZmZiIvPgo8L3N2Zz4=`;

export async function exportReportToPDF({
  report,
  contentElement,
}: PDFExportOptions): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header height
  const headerHeight = 25;
  // Footer height
  const footerHeight = 15;
  // Available content height per page
  const contentAreaHeight = pageHeight - headerHeight - footerHeight - margin * 2;

  // Add header function
  const addHeader = (pageNum: number, totalPages: number) => {
    // Logo
    pdf.addImage(GORGONE_LOGO_BASE64, "SVG", margin, 10, 12, 12);

    // Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("GORGONE", margin + 16, 17);

    // Subtitle
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(128, 128, 128);
    pdf.text("Intelligence Report", margin + 16, 21);

    // Date on the right
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    const date = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    pdf.text(date, pageWidth - margin, 17, { align: "right" });

    // Page number
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, 21, {
      align: "right",
    });

    // Line separator
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 26, pageWidth - margin, 26);

    // Reset text color
    pdf.setTextColor(0, 0, 0);
  };

  // Add footer function
  const addFooter = () => {
    const footerY = pageHeight - 10;

    // Confidential notice
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(180, 0, 0);
    pdf.text("CONFIDENTIAL", pageWidth / 2, footerY, { align: "center" });

    // Reset
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");

    // Line separator
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  };

  try {
    // Capture the content as canvas
    const canvas = await html2canvas(contentElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Calculate how many pages we need
    const totalPages = Math.ceil(imgHeight / contentAreaHeight);

    // Add pages
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Add header
      addHeader(i + 1, totalPages);

      // Calculate the portion of the image to show on this page
      const sourceY = i * contentAreaHeight * (canvas.width / imgWidth);
      const sourceHeight = Math.min(
        contentAreaHeight * (canvas.width / imgWidth),
        canvas.height - sourceY
      );

      // Create a temporary canvas for this page's content
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;

      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL("image/png");
        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;

        pdf.addImage(
          pageImgData,
          "PNG",
          margin,
          headerHeight + 5,
          imgWidth,
          pageImgHeight
        );
      }

      // Add footer
      addFooter();
    }

    // Save the PDF
    const filename = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}

