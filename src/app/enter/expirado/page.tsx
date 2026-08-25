import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";

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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-8">
        <Logo />
      </div>

      <Card className="w-full max-w-md p-8 text-center shadow-2xl shadow-black/30">
        <div
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full text-2xl"
          style={{ backgroundColor: "var(--brand-soft)" }}
          aria-hidden
        >
          🔑
        </div>
        <h1 className="text-xl font-bold">Acesso indisponível</h1>
        <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-fg-lo">{message}</p>
        <a
          href={mailto}
          className="inline-flex items-center justify-center rounded bg-brand px-4 py-2.5 text-sm font-medium text-[#111] transition-colors duration-200 ease-brand hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
        >
          Pedir novo acesso
        </a>
      </Card>
    </main>
  );
}
