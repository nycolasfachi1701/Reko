import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Display com personalidade + UI limpa (SPEC §8.2, direção aprovada).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reko — Nstech",
  description:
    "Reko, a plataforma de vídeos da Nstech: assista e acompanhe o desempenho dos vídeos.",
};

// Aplica o tema salvo antes da pintura, evitando flash.
const themeScript = `try{var t=localStorage.getItem("reko-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
