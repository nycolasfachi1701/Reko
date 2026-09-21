"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatDuration } from "@/lib/utils";
import {
  addItem,
  addModule,
  archiveTrack,
  deleteModule,
  deleteTrack,
  moveItem,
  moveModule,
  publishTrack,
  removeItem,
  renameModule,
  updateTrack,
} from "../actions";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
interface EditorItem {
  id: string;
  videoId: string;
  title: string;
  durationSec: number;
}
interface EditorModule {
  id: string;
  title: string;
  items: EditorItem[];
}
interface EditorTrack {
  id: string;
  title: string;
  description: string;
  coverUrl: string | null;
  status: Status;
  modules: EditorModule[];
  looseItems: EditorItem[];
}
interface Video {
  id: string;
  title: string;
  durationSec: number;
}

const STATUS_LABEL: Record<Status, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  ARCHIVED: "Arquivada",
};

export function TrackEditor({ track, videos }: { track: EditorTrack; videos: Video[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ações → executa, re-sincroniza a página, mostra erro
  function run(fn: () => Promise<unknown>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha na operação.");
      }
    });
  }

  // vídeos já na trilha (para não oferecer duplicados no seletor)
  const present = useMemo(() => {
    const s = new Set<string>();
    for (const m of track.modules) for (const it of m.items) s.add(it.videoId);
    for (const it of track.looseItems) s.add(it.videoId);
    return s;
  }, [track]);
  const available = useMemo(() => videos.filter((v) => !present.has(v.id)), [videos, present]);

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Editar trilha</h1>
          <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-fg-lo">
            {STATUS_LABEL[track.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/t/${track.id}`} target="_blank">
            <Button variant="secondary" size="sm">Ver como espectador</Button>
          </Link>
          {track.status !== "PUBLISHED" ? (
            <Button size="sm" disabled={pending} onClick={() => run(() => publishTrack(track.id))}>
              Publicar
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => archiveTrack(track.id))}>
              Arquivar
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-4 text-sm text-negative">
          {error}
        </p>
      ) : null}

      <MetaForm track={track} pending={pending} run={run} />

      {/* Módulos */}
      <div className="mt-6 flex flex-col gap-4">
        {track.modules.map((m, i) => (
          <ModuleBlock
            key={m.id}
            trackId={track.id}
            module={m}
            isFirst={i === 0}
            isLast={i === track.modules.length - 1}
            available={available}
            pending={pending}
            run={run}
          />
        ))}

        {/* Vídeos soltos (fora de módulo) */}
        {track.looseItems.length > 0 ? (
          <Card className="p-4">
            <p className="mb-2 text-sm font-medium text-fg-lo">Sem módulo</p>
            <ItemList items={track.looseItems} pending={pending} run={run} />
          </Card>
        ) : null}
        <LooseAdd trackId={track.id} available={available} pending={pending} run={run} />

        <AddModule trackId={track.id} pending={pending} run={run} />
      </div>

      <div className="mt-10 border-t border-[var(--border)] pt-5">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir esta trilha? Os vídeos não são apagados.")) {
              run(async () => {
                await deleteTrack(track.id);
                router.push("/manage/tracks");
              });
            }
          }}
          className="text-negative hover:text-negative"
        >
          Excluir trilha
        </Button>
      </div>
    </div>
  );
}

function MetaForm({
  track,
  pending,
  run,
}: {
  track: EditorTrack;
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [description, setDescription] = useState(track.description);
  const [coverUrl, setCoverUrl] = useState(track.coverUrl ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run(() => updateTrack({ id: track.id, title, description, coverUrl: coverUrl || null }));
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-title">Nome</Label>
          <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={pending} required minLength={2} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-desc">Descrição</Label>
          <textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={pending}
            className="w-full resize-y rounded-sm border border-[var(--border)] bg-surface-2 px-3 py-2 text-sm text-fg-hi outline-none transition-colors focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-cover">Capa (URL, opcional)</Label>
          <Input id="t-cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} disabled={pending} placeholder="https://…" />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="self-start">
          Salvar dados
        </Button>
      </form>
    </Card>
  );
}

function ModuleBlock({
  trackId,
  module,
  isFirst,
  isLast,
  available,
  pending,
  run,
}: {
  trackId: string;
  module: EditorModule;
  isFirst: boolean;
  isLast: boolean;
  available: Video[];
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [title, setTitle] = useState(module.title);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== module.title) run(() => renameModule(module.id, title));
          }}
          disabled={pending}
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-fg-hi outline-none hover:border-[var(--border)] focus:border-brand"
          aria-label="Nome do módulo"
        />
        <MoveButtons
          disabled={pending}
          canUp={!isFirst}
          canDown={!isLast}
          onUp={() => run(() => moveModule(module.id, "up"))}
          onDown={() => run(() => moveModule(module.id, "down"))}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir este módulo? Os vídeos dele ficam soltos na trilha.")) run(() => deleteModule(module.id));
          }}
          className="text-xs text-fg-mut transition-colors hover:text-negative disabled:opacity-50"
        >
          Excluir
        </button>
      </div>

      <ItemList items={module.items} pending={pending} run={run} />
      <AddVideo trackId={trackId} moduleId={module.id} available={available} pending={pending} run={run} />
    </Card>
  );
}

function ItemList({
  items,
  pending,
  run,
}: {
  items: EditorItem[];
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  if (items.length === 0) return <p className="py-1 text-xs text-fg-mut">Nenhum vídeo aqui ainda.</p>;
  return (
    <ul className="flex flex-col divide-y divide-[var(--border)]">
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-2 py-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-surface-2 text-[10px] tabular-nums text-fg-mut">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-fg-hi">{it.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-fg-mut">{formatDuration(it.durationSec)}</span>
          <MoveButtons
            disabled={pending}
            canUp={i > 0}
            canDown={i < items.length - 1}
            onUp={() => run(() => moveItem(it.id, "up"))}
            onDown={() => run(() => moveItem(it.id, "down"))}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => removeItem(it.id))}
            className="text-xs text-fg-mut transition-colors hover:text-negative disabled:opacity-50"
          >
            Remover
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddVideo({
  trackId,
  moduleId,
  available,
  pending,
  run,
}: {
  trackId: string;
  moduleId: string | null;
  available: Video[];
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [videoId, setVideoId] = useState("");
  if (available.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <select
        value={videoId}
        onChange={(e) => setVideoId(e.target.value)}
        disabled={pending}
        className="h-9 min-w-0 flex-1 rounded-sm border border-[var(--border)] bg-surface-2 px-2 text-sm text-fg-hi outline-none focus:border-brand"
      >
        <option value="">Adicionar vídeo…</option>
        {available.map((v) => (
          <option key={v.id} value={v.id}>
            {v.title}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending || !videoId}
        onClick={() => {
          const vid = videoId;
          setVideoId("");
          run(() => addItem(trackId, vid, moduleId));
        }}
      >
        Adicionar
      </Button>
    </div>
  );
}

function LooseAdd({
  trackId,
  available,
  pending,
  run,
}: {
  trackId: string;
  available: Video[];
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  return (
    <Card className="p-4">
      <p className="mb-1 text-sm font-medium text-fg-lo">Adicionar vídeo sem módulo</p>
      <AddVideo trackId={trackId} moduleId={null} available={available} pending={pending} run={run} />
    </Card>
  );
}

function AddModule({
  trackId,
  pending,
  run,
}: {
  trackId: string;
  pending: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Novo módulo (ex.: Módulo 1 — Introdução)"
        disabled={pending}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={pending || title.trim().length < 1}
        onClick={() => {
          const t = title;
          setTitle("");
          run(() => addModule(trackId, t));
        }}
      >
        + Módulo
      </Button>
    </div>
  );
}

function MoveButtons({
  disabled,
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  disabled: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label="Mover para cima"
        disabled={disabled || !canUp}
        onClick={onUp}
        className="grid h-6 w-6 place-items-center rounded text-fg-mut transition-colors hover:bg-surface-2 hover:text-fg-hi disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="Mover para baixo"
        disabled={disabled || !canDown}
        onClick={onDown}
        className="grid h-6 w-6 place-items-center rounded text-fg-mut transition-colors hover:bg-surface-2 hover:text-fg-hi disabled:opacity-30"
      >
        ↓
      </button>
    </span>
  );
}
