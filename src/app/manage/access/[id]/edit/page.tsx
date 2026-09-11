import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { ManageHeader } from "../../../manage-header";
import { EditUserForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireRole([Role.ADMIN]);
  const { id } = await params;

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) notFound();

  return (
    <>
      <ManageHeader user={admin} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/manage/access"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar aos usuários
        </Link>
        <h1 className="mb-1 mt-4 font-display text-2xl font-bold">Editar usuário</h1>
        <p className="mb-8 text-sm text-fg-lo">
          Atualize nome, e-mail e papel. Deixe a senha em branco para mantê-la.
        </p>
        <Card className="p-6">
          <EditUserForm
            id={target.id}
            initial={{
              name: target.name,
              email: target.email ?? "",
              role: target.role,
            }}
          />
        </Card>
      </main>
    </>
  );
}
