"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { createTrack } from "./actions";

export function CreateTrackForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const { id } = await createTrack({ title, description });
        router.push(`/manage/tracks/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao criar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="track-title">Nome da trilha</Label>
        <Input
          id="track-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
          placeholder="Ex.: Onboarding do Motorista"
          disabled={pending}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="track-desc">Descrição</Label>
        <textarea
          id="track-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={pending}
          className="w-full resize-y rounded-sm border border-[var(--border)] bg-surface-2 px-3 py-2 text-sm text-fg-hi outline-none transition-colors placeholder:text-fg-mut focus:border-brand"
          placeholder="Do que se trata este curso?"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || title.trim().length < 2}>
        {pending ? "Criando…" : "Criar trilha"}
      </Button>
    </form>
  );
}
