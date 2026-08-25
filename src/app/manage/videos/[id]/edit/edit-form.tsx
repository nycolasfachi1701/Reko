"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { updateVideo } from "../../actions";

interface Initial {
  title: string;
  description: string;
  tags: string;
  targetViews: string;
  completion: string;
}

export function EditVideoForm({ id, initial }: { id: string; initial: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [tags, setTags] = useState(initial.tags);
  const [targetViews, setTargetViews] = useState(initial.targetViews);
  const [completion, setCompletion] = useState(initial.completion);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const target = targetViews ? Number.parseInt(targetViews, 10) : null;
    const rate = completion ? Number.parseFloat(completion) / 100 : null;

    start(async () => {
      try {
        await updateVideo({
          id,
          title,
          description,
          tags: tags.split(","),
          targetViews: target && target > 0 ? target : null,
          expectedCompletionRate: rate && rate > 0 && rate <= 1 ? rate : null,
        });
        router.push("/manage/videos");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          rows={3}
          className="w-full rounded border border-[var(--border)] bg-surface-0 px-3 py-2 text-sm text-fg-hi outline-none transition-colors focus:border-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target">Meta de views</Label>
          <Input
            id="target"
            type="number"
            min={0}
            value={targetViews}
            onChange={(e) => setTargetViews(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="completion">Meta de conclusão %</Label>
          <Input
            id="completion"
            type="number"
            min={0}
            max={100}
            value={completion}
            onChange={(e) => setCompletion(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => router.push("/manage/videos")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
