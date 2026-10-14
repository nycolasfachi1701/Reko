"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { uploadCaptions, removeCaptions } from "../../actions";

export function CaptionsField({
  videoId,
  hasCaptions,
}: {
  videoId: string;
  hasCaptions: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function submit() {
    const file = inputRef.current?.files?.[0] ?? null;
    setError(null);
    setOk(null);
    if (!file) {
      setError("Selecione um arquivo .vtt.");
      return;
    }
    if (!/\.vtt$/i.test(file.name)) {
      setError("Selecione um arquivo .vtt.");
      return;
    }
    start(async () => {
      try {
        const text = await file.text();
        await uploadCaptions(videoId, text);
        setOk("Legendas enviadas.");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao enviar.");
      }
    });
  }

  function onRemove() {
    setError(null);
    setOk(null);
    start(async () => {
      try {
        await removeCaptions(videoId);
        setOk("Legendas removidas.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao remover.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg-hi">Legendas (.vtt)</p>
          <p className="text-xs text-fg-mut">
            {hasCaptions
              ? "Legendas ativas neste vídeo."
              : "Sem legendas. Envie um arquivo WebVTT (.vtt)."}
          </p>
        </div>
        {hasCaptions ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={onRemove}
          >
            Remover
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".vtt,text/vtt"
          aria-label="Arquivo de legendas (.vtt)"
          disabled={pending}
          onChange={() => {
            setError(null);
            setOk(null);
          }}
          className="block max-w-full text-sm text-fg-lo file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg-hi hover:file:bg-surface-3"
        />
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-positive">{ok}</p> : null}
    </div>
  );
}
