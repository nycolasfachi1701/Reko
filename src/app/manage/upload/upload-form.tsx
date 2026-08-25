"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { formatDuration } from "@/lib/utils";
import { prepareUpload, finalizeVideo } from "./actions";

type Phase = "idle" | "reading" | "ready" | "uploading" | "error";

/** Extrai duração + frame (~10%) do vídeo no navegador, sem ffmpeg no servidor. */
function extractMeta(
  file: File,
): Promise<{ duration: number; thumb: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let duration = 0;

    const finish = (thumb: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve({ duration, thumb });
    };

    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = Math.min(Math.max(duration * 0.1, 0), Math.max(duration - 0.1, 0));
      video.onseeked = () => {
        try {
          const w = 640;
          const ratio = video.videoWidth ? video.videoHeight / video.videoWidth : 0.5625;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = Math.round(w * ratio);
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.82);
        } catch {
          finish(null);
        }
      };
      try {
        video.currentTime = target;
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no upload (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Erro de rede durante o upload"));
    xhr.send(body);
  });
}

export function UploadForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const fileRef = useRef<File | null>(null);
  const thumbRef = useRef<Blob | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [fileName, setFileName] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [targetViews, setTargetViews] = useState("");
  const [completion, setCompletion] = useState("");
  const [publish, setPublish] = useState(true);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase("reading");
    fileRef.current = file;
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));

    const { duration: dur, thumb } = await extractMeta(file);
    setDuration(dur);
    thumbRef.current = thumb;
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    setThumbUrl(thumb ? URL.createObjectURL(thumb) : null);
    setPhase("ready");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current;
    if (!file) {
      setError("Selecione um arquivo de vídeo.");
      return;
    }
    if (title.trim().length < 2) {
      setError("Informe um título.");
      return;
    }

    setError(null);
    setPhase("uploading");
    setProgress(0);

    try {
      const prepared = await prepareUpload({ contentType: file.type });
      await putWithProgress(prepared.videoUploadUrl, file, file.type, setProgress);

      if (thumbRef.current) {
        await putWithProgress(prepared.thumbUploadUrl, thumbRef.current, "image/jpeg");
      }

      const target = targetViews ? Number.parseInt(targetViews, 10) : null;
      const rate = completion ? Number.parseFloat(completion) / 100 : null;

      await finalizeVideo({
        videoKey: prepared.videoKey,
        thumbKey: thumbRef.current ? prepared.thumbKey : null,
        durationSec: duration,
        title,
        description,
        tags: tags.split(","),
        targetViews: target && target > 0 ? target : null,
        expectedCompletionRate: rate && rate > 0 && rate <= 1 ? rate : null,
        publish,
      });

      router.push("/manage/videos");
      router.refresh();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Falha ao enviar o vídeo.");
    }
  }

  const busy = phase === "uploading";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">Arquivo de vídeo</Label>
        <input
          id="file"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={onFile}
          disabled={busy}
          className="text-sm text-fg-lo file:mr-3 file:rounded file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#111] hover:file:bg-brand-strong"
        />
        {phase === "reading" ? (
          <p className="text-sm text-fg-lo">Lendo o arquivo…</p>
        ) : null}
      </div>

      {phase !== "idle" && phase !== "reading" && fileName ? (
        <div className="flex gap-4 rounded-lg border border-[var(--border)] bg-surface-2 p-3">
          <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded bg-surface-0">
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt="Miniatura" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-fg-lo">
                sem miniatura
              </div>
            )}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{fileName}</p>
            <p className="text-fg-lo">Duração: {formatDuration(duration)}</p>
            <p className="text-fg-lo">
              Miniatura: {thumbRef.current ? "extraída (frame ~10%)" : "não gerada"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
          rows={3}
          className="w-full rounded border border-[var(--border)] bg-surface-0 px-3 py-2 text-sm text-fg-hi outline-none transition-colors placeholder:text-fg-lo focus:border-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={busy}
          placeholder="onboarding, produto"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target">Meta de views (opcional)</Label>
          <Input
            id="target"
            type="number"
            min={0}
            value={targetViews}
            onChange={(e) => setTargetViews(e.target.value)}
            disabled={busy}
            placeholder="2000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="completion">Meta de conclusão % (opcional)</Label>
          <Input
            id="completion"
            type="number"
            min={0}
            max={100}
            value={completion}
            onChange={(e) => setCompletion(e.target.value)}
            disabled={busy}
            placeholder="65"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          disabled={busy}
          className="h-4 w-4 accent-[var(--brand)]"
        />
        Publicar imediatamente (senão fica como rascunho)
      </label>

      {busy ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-fg-lo tabular-nums">
            Enviando… {progress}%
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={busy || phase === "idle" || phase === "reading"}
        className="w-full py-2.5"
      >
        {busy ? "Enviando…" : publish ? "Enviar e publicar" : "Salvar rascunho"}
      </Button>
    </form>
  );
}
