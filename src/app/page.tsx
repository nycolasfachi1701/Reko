// Placeholder da Fase 1. O feed real do espectador chega na Fase 4.
// Não consulta o banco de propósito: mantém o build independente do DB.

const swatches = [
  { name: "brand", className: "bg-brand" },
  { name: "brand-strong", className: "bg-brand-strong" },
  { name: "surface-1", className: "bg-surface-1" },
  { name: "surface-2", className: "bg-surface-2" },
  { name: "positive", className: "bg-positive" },
  { name: "warning", className: "bg-warning" },
  { name: "negative", className: "bg-negative" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="inline-block h-8 w-2 rounded bg-brand" aria-hidden />
        <h1 className="text-3xl font-black tracking-tight">
          Plataforma de Vídeos <span className="text-brand">Nstech</span>
        </h1>
      </div>

      <p className="max-w-prose text-lg text-fg-lo">
        Fase 1 concluída — fundação no ar: Next.js (App Router, TypeScript
        strict), Tailwind com tokens de marca, schema Prisma e seed de dados.
      </p>

      <section aria-label="Tokens de marca" className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <div
            key={s.name}
            className="flex flex-col items-center gap-2 rounded border border-[var(--border)] bg-surface-1 p-3"
          >
            <span className={`h-12 w-12 rounded ${s.className}`} aria-hidden />
            <span className="text-xs text-fg-lo">{s.name}</span>
          </div>
        ))}
      </section>

      <p className="text-sm text-fg-lo tabular-nums">
        Próxima fase: autenticação (login do gestor, AccessToken, /enter/&lt;token&gt;).
      </p>
    </main>
  );
}
