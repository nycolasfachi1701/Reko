import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { Card } from "@/components/ui";
import { ManageHeader } from "./manage-header";

// Painel-placeholder da Fase 2. O painel de analytics real chega na Fase 7.
export default async function ManageHome() {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold">Olá, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-fg-lo">
          Bem-vindo à área de gestão da plataforma de vídeos.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded bg-[var(--brand-soft)] text-brand">
              📊
            </div>
            <h2 className="font-semibold">Painel de desempenho</h2>
            <p className="mt-1 text-sm text-fg-lo">
              Visualizações, percepção e expectativa por vídeo.
            </p>
            <p className="mt-3 text-xs text-fg-lo">Em breve (Fase 7)</p>
          </Card>

          {user.role === Role.ADMIN ? (
            <Link
              href="/manage/access"
              className="group rounded-lg border border-[var(--border)] bg-surface-1 p-5 transition-colors duration-200 ease-brand hover:border-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            >
              <div className="mb-3 grid h-9 w-9 place-items-center rounded bg-[var(--brand-soft)] text-brand">
                🔗
              </div>
              <h2 className="font-semibold group-hover:text-brand">
                Gerar acesso de espectador
              </h2>
              <p className="mt-1 text-sm text-fg-lo">
                Crie um espectador e um link de acesso de uso único.
              </p>
              <p className="mt-3 text-xs text-brand">Abrir →</p>
            </Link>
          ) : null}
        </section>
      </main>
    </>
  );
}
