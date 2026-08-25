"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { VideoStatus } from "@prisma/client";
import { Button } from "@/components/ui";
import { archiveVideo, deleteVideo, publishVideo } from "./actions";

export function VideoRowActions({
  id,
  status,
}: {
  id: string;
  status: VideoStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {status !== VideoStatus.PUBLISHED ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => publishVideo(id))}
        >
          Publicar
        </Button>
      ) : (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => archiveVideo(id))}
        >
          Arquivar
        </Button>
      )}
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir este vídeo? Esta ação não pode ser desfeita.")) {
            run(() => deleteVideo(id));
          }
        }}
        className="text-negative hover:text-negative"
      >
        Excluir
      </Button>
    </div>
  );
}
