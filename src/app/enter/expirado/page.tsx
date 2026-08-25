const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "suporte@nstech.com.br";

export default async function EnterExpiredPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;

  const message =
    motivo === "limite"
      ? "Tentativas demais em pouco tempo. Aguarde alguns minutos e use um link novo."
      : "Este link de acesso não é mais válido — ele pode ter expirado ou já ter sido usado.";

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Novo acesso à plataforma de vídeos",
  )}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-lg border bg-surface-1 p-8 text-center">
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--brand-soft)" }}
          aria-hidden
        >
          <span className="text-2xl">🔑</span>
        </div>
        <h1 className="mb-2 text-xl font-bold">Acesso indisponível</h1>
        <p className="mb-6 text-fg-lo">{message}</p>
        <a
          href={mailto}
          className="inline-block rounded bg-brand px-4 py-2 font-medium text-[#111] transition-colors duration-200 ease-brand hover:bg-brand-strong"
        >
          Pedir novo acesso
        </a>
      </div>
    </main>
  );
}
