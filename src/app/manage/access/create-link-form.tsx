"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  createViewerAndLinkAction,
  type CreateLinkState,
} from "../actions";

const initial: CreateLinkState = {};

export function CreateLinkForm() {
  const [state, formAction, pending] = useActionState(
    createViewerAndLinkAction,
    initial,
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do espectador</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            placeholder="Ex.: Maria Silva"
            className="flex-1"
          />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? "Gerando…" : "Gerar link"}
          </Button>
        </div>
      </form>

      {state.error ? (
        <p role="alert" className="text-sm text-negative">
          {state.error}
        </p>
      ) : null}

      {state.link ? (
        <div className="rounded-lg border border-[var(--border)] bg-surface-2 p-4">
          <p className="mb-3 text-sm text-fg-lo">
            Link de uso único gerado. Copie e envie ao espectador — ele não será
            mostrado de novo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-surface-0 px-3 py-2 text-sm text-fg-hi">
              {state.link}
            </code>
            <Button variant="secondary" onClick={copy} className="shrink-0">
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          {state.expiresAt ? (
            <p className="mt-3 text-xs text-fg-lo">
              Expira em {new Date(state.expiresAt).toLocaleString("pt-BR")}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
