import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Certificado de conclusão de trilha em PDF (A4 paisagem), gerado com pdf-lib
// (JS puro, sem binário nativo). As fontes padrão (Helvetica) do PDF já cobrem
// os acentos do português via WinAnsi.

export interface CertificateData {
  userName: string;
  trackTitle: string;
  completedAt: Date;
  videoCount: number;
}

const BRAND = rgb(1, 0.4, 0); // #ff6600
const INK = rgb(0.09, 0.086, 0.102); // ~#17161a
const MUTED = rgb(0.42, 0.41, 0.45);

function formatDatePt(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(d);
}

export async function buildCertificatePdf(
  data: CertificateData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado — ${data.trackTitle}`);
  doc.setAuthor("Reko");

  const page = doc.addPage([842, 595]); // A4 paisagem (pt)
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const center = (
    text: string,
    y: number,
    size: number,
    f = font,
    color = INK,
  ) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font: f, color });
  };

  // Moldura dupla
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: BRAND,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: rgb(0.86, 0.86, 0.86),
    borderWidth: 1,
  });

  // Marca (logo da Atua) + wordmark, centralizados no topo
  let markWidth = 0;
  let markImg: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public", "atua-mark.png"),
    );
    markImg = await doc.embedPng(bytes);
    markWidth = 26;
  } catch {
    markImg = null;
  }
  const word = "Reko";
  const wordSize = 22;
  const wordWidth = bold.widthOfTextAtSize(word, wordSize);
  const gap = markImg ? 10 : 0;
  const markH = markImg ? (markWidth * markImg.height) / markImg.width : 0;
  const blockW = markWidth + gap + wordWidth;
  const startX = (width - blockW) / 2;
  const brandY = height - 92;
  if (markImg) {
    page.drawImage(markImg, {
      x: startX,
      y: brandY - markH / 2 + wordSize / 2 - 4,
      width: markWidth,
      height: markH,
    });
  }
  page.drawText(word, {
    x: startX + markWidth + gap,
    y: brandY,
    size: wordSize,
    font: bold,
    color: INK,
  });

  // Título
  center("CERTIFICADO DE CONCLUSÃO", height - 170, 15, bold, BRAND);

  // Linha decorativa curta
  const lineW = 70;
  page.drawLine({
    start: { x: (width - lineW) / 2, y: height - 185 },
    end: { x: (width + lineW) / 2, y: height - 185 },
    thickness: 2,
    color: BRAND,
  });

  // Corpo
  center("Certificamos que", height - 240, 14, font, MUTED);
  center(data.userName, height - 290, 34, bold, INK);
  center("concluiu com êxito a trilha", height - 330, 14, font, MUTED);
  center(data.trackTitle, height - 372, 22, bold, INK);

  // Rodapé: data + quantidade de vídeos
  const plural = data.videoCount === 1 ? "vídeo" : "vídeos";
  center(
    `Concluída em ${formatDatePt(data.completedAt)} · ${data.videoCount} ${plural}`,
    96,
    12,
    font,
    MUTED,
  );
  center("Reko · Plataforma de vídeos", 72, 10, font, rgb(0.6, 0.6, 0.62));

  return doc.save();
}
