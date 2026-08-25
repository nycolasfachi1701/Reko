"use client";

import { useActionState, useState } from "react";
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
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium">
          Nome do espectador
        </label>
        <div className="flex gap-2">
          <input
            id="name"
            name="name"
            required
            minLength={2}
            className="flex-1 rounded border bg-surface-0 px-3 py-2 outline-none transition-colors focus:border-brand"
            placeholder="Ex.: Maria Silva"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-brand px-4 py-2 font-medium text-[#111] transition-colors duration-200 ease-brand hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? "Gerando…" : "Gerar link"}
          </button>
        </div>
      </form>

      {state.error ? (
        <p role="alert" className="text-sm text-negative">
          {state.error}
        </p>
      ) : null}

      {state.link ? (
        <div className="rounded-lg border bg-surface-2 p-4">
          <p className="mb-2 text-sm text-fg-lo">
            Link de uso único gerado. Copie e envie ao espectador — ele não
            será mostrado de novo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-surface-0 px-3 py-2 text-sm">
              {state.link}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded border px-3 py-2 text-sm transition-colors hover:bg-surface-1"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          {state.expiresAt ? (
            <p className="mt-2 text-xs text-fg-lo">
              Expira em {new Date(state.expiresAt).toLocaleString("pt-BR")}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
