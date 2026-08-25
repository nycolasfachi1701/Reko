import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { Card } from "@/components/ui";
import { ManageHeader } from "../manage-header";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/manage/videos"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar aos vídeos
        </Link>
        <h1 className="mb-1 mt-4 text-2xl font-bold">Enviar vídeo</h1>
        <p className="mb-8 text-sm text-fg-lo">
          mp4, mov ou webm até 2 GB. A miniatura e a duração são extraídas
          automaticamente do próprio arquivo.
        </p>
        <Card className="p-6">
          <UploadForm />
        </Card>
      </main>
    </>
  );
}
