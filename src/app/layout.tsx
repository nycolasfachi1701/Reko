import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// Fonte da marca (SPEC §8.2) — self-hosted pelo next/font, zero layout shift.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reko — Nstech",
  description:
    "Reko, a plataforma de vídeos da Nstech: assista e acompanhe o desempenho dos vídeos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={roboto.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
