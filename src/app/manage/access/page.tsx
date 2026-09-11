import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { ManageHeader } from "../manage-header";
import { CreateUserForm } from "./create-user-form";

const ROLE_LABEL: Record<Role, string> = {
  VIEWER: "Espectador",
  MANAGER: "Gestor",
  ADMIN: "Administrador",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireRole([Role.ADMIN]);

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/manage"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar à gestão
        </Link>

        <h1 className="mb-1 mt-4 font-display text-2xl font-bold">Usuários</h1>
        <p className="mb-8 text-sm text-fg-lo">
          Crie contas de espectador, gestor ou administrador — todas entram com
          e-mail e senha.
        </p>

        <Card className="mb-8 p-6">
          <CreateUserForm />
        </Card>

        <Card className="divide-y divide-[var(--border)]">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/manage/access/${u.id}/edit`}
              className="group flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-fg-mut">
                  {u.email ?? "sem e-mail"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-fg-lo">
                  {ROLE_LABEL[u.role]}
                </span>
                <span className="text-xs text-fg-mut transition-colors group-hover:text-brand">
                  Editar →
                </span>
              </div>
            </Link>
          ))}
        </Card>
      </main>
    </>
  );
}
