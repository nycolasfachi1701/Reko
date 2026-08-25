import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { CreateLinkForm } from "./create-link-form";

export default async function AccessPage() {
  await requireRole([Role.ADMIN]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/manage"
        className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
      >
        ← Voltar à gestão
      </Link>

      <h1 className="mb-1 mt-4 text-2xl font-bold">Gerar acesso de espectador</h1>
      <p className="mb-8 text-sm text-fg-lo">
        Cria um espectador e um link de acesso sem senha, de uso único.
      </p>

      <CreateLinkForm />
    </main>
  );
}
