import Link from "next/link";
import { Logo } from "@/components/logo";

// Placeholder da home. O feed real do espectador chega na Fase 4.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Logo />
        <Link
          href="/login"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          Área de gestão →
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand">
          Plataforma interna de vídeos
        </p>
        <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Assista, acompanhe e entenda o desempenho dos seus vídeos.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-lo">
          O feed de vídeos aparece aqui. Espectadores entram por um link de
          acesso — sem senha e sem cadastro.
        </p>

        <div className="mt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-surface-1 px-3 py-1 text-xs text-fg-lo">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden />
            Fundação e autenticação prontas · feed em construção (Fase 4)
          </span>
        </div>
      </main>
    </div>
  );
}
