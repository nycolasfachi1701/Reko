"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface ImportError {
  line: number;
  email: string;
  reason: string;
}
interface ImportResult {
  created: number;
  failed: number;
  total: number;
  errors: ImportError[];
  resultFileBase64: string;
  resultFileName: string;
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function base64ToUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }));
}

export function BulkImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function submit() {
    const file = inputRef.current?.files?.[0] ?? null;
    if (!file) {
      setError("Selecione um arquivo .xlsx.");
      return;
    }
    setPending(true);
    setError(null);
    setResult(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);

    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/manage/access/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Falha na importação.");
        return;
      }
      const r = data as ImportResult;
      setResult(r);
      const url = base64ToUrl(r.resultFileBase64);
      setResultUrl(url);
      // dispara o download da planilha de senhas
      const a = document.createElement("a");
      a.href = url;
      a.download = r.resultFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // limpa seleção e atualiza a lista de usuários
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Falha na importação. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold">Importar em massa</h2>
        <p className="mt-1 text-sm text-fg-lo">
          Baixe o modelo, preencha uma linha por usuário e envie. As senhas são
          geradas automaticamente — ao final, baixe a planilha de resultado para
          distribuí-las.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/manage/access/import/template"
          className="inline-flex items-center gap-2 rounded-sm border border-[var(--border-strong)] bg-surface-1 px-4 py-2 text-sm font-medium text-fg-hi transition-colors hover:bg-surface-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Baixar modelo (.xlsx)
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={() => setError(null)}
          className="block max-w-full text-sm text-fg-lo file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg-hi hover:file:bg-surface-3"
        />
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Importando…" : "Importar"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className="rounded-sm border border-[var(--border)] p-4 text-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--surface-2) 60%, transparent)" }}
        >
          <p className="font-medium">
            <span className="text-positive">{result.created} criado(s)</span>
            {result.failed > 0 ? (
              <>
                {" · "}
                <span className="text-negative">{result.failed} com erro</span>
              </>
            ) : null}
            {" "}de {result.total}.
          </p>

          {resultUrl ? (
            <a
              href={resultUrl}
              download={result.resultFileName}
              className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
            >
              Baixar planilha de senhas (.xlsx)
            </a>
          ) : null}

          {result.errors.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1 text-xs text-fg-lo">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Linha {e.line}
                  {e.email ? ` (${e.email})` : ""}: {e.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
