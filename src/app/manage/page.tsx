import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { logoutAction } from "./actions";

// Painel-placeholder da Fase 2. O painel de analytics real chega na Fase 7.
export default async function ManageHome() {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão</h1>
          <p className="text-sm text-fg-lo">
            {user.name} · {user.role === Role.ADMIN ? "Administrador" : "Gestor"}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded border px-3 py-1.5 text-sm text-fg-hi transition-colors hover:bg-surface-2"
          >
            Sair
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-surface-1 p-5">
          <h2 className="mb-1 font-semibold">Painel de desempenho</h2>
          <p className="text-sm text-fg-lo">
            Visualizações, percepção e expectativa por vídeo. (Fase 7)
          </p>
        </div>

        {user.role === Role.ADMIN ? (
          <Link
            href="/manage/access"
            className="rounded-lg border bg-surface-1 p-5 transition-colors hover:border-brand"
          >
            <h2 className="mb-1 font-semibold">Gerar acesso de espectador</h2>
            <p className="text-sm text-fg-lo">
              Crie um espectador e um link de acesso de uso único.
            </p>
          </Link>
        ) : null}
      </section>
    </main>
  );
}
