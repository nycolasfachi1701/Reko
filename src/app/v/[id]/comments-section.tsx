"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { formatRelativeTime } from "@/lib/format";
import { postComment, deleteComment } from "./actions";

export interface CommentView {
  id: string;
  authorName: string;
  body: string;
  createdAt: string; // ISO
  deleted: boolean;
  canDelete: boolean;
  replies: CommentView[];
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "•";
}

function countVisible(list: CommentView[]): number {
  return list.reduce(
    (n, c) => n + (c.deleted ? 0 : 1) + countVisible(c.replies),
    0,
  );
}

export function CommentsSection({
  videoId,
  comments,
}: {
  videoId: string;
  comments: CommentView[];
}) {
  const total = countVisible(comments);

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg font-bold">
        {total} {total === 1 ? "comentário" : "comentários"}
      </h2>

      <Composer videoId={videoId} placeholder="Escreva um comentário…" />

      <div className="mt-6 flex flex-col gap-5">
        {comments.length === 0 ? (
          <p className="text-sm text-fg-mut">Seja o primeiro a comentar.</p>
        ) : (
          comments.map((c) => <CommentItem key={c.id} videoId={videoId} comment={c} />)
        )}
      </div>
    </section>
  );
}

function CommentItem({
  videoId,
  comment,
  isReply = false,
}: {
  videoId: string;
  comment: CommentView;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Remover este comentário?")) return;
    start(async () => {
      try {
        await deleteComment(comment.id);
      } finally {
        // sucesso ou falha (ex.: sem permissão): re-sincroniza com o servidor
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
        style={{ background: "linear-gradient(135deg,#ff8a3d,#ff5a00)" }}
        aria-hidden
      >
        {comment.deleted ? "–" : initials(comment.authorName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="rk-glass rounded-lg px-3.5 py-2.5">
          <p className="flex items-baseline gap-2 text-xs text-fg-mut">
            <span className="font-medium text-fg-hi">
              {comment.deleted ? "—" : comment.authorName}
            </span>
            <span>{formatRelativeTime(new Date(comment.createdAt))}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-fg-hi">
            {comment.deleted ? (
              <span className="italic text-fg-mut">comentário removido</span>
            ) : (
              comment.body
            )}
          </p>
        </div>

        {!comment.deleted ? (
          <div className="mt-1 flex items-center gap-3 pl-1 text-xs text-fg-mut">
            {!isReply ? (
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="transition-colors hover:text-fg-hi"
              >
                Responder
              </button>
            ) : null}
            {comment.canDelete ? (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="transition-colors hover:text-negative disabled:opacity-50"
              >
                Remover
              </button>
            ) : null}
          </div>
        ) : null}

        {replying ? (
          <div className="mt-2">
            <Composer
              videoId={videoId}
              parentId={comment.id}
              placeholder="Escreva uma resposta…"
              autoFocus
              onDone={() => setReplying(false)}
            />
          </div>
        ) : null}

        {comment.replies.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4 border-l border-[var(--border)] pl-4">
            {comment.replies.map((r) => (
              <CommentItem key={r.id} videoId={videoId} comment={r} isReply />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Composer({
  videoId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  videoId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    start(async () => {
      try {
        await postComment(videoId, body, parentId);
        setText("");
        onDone?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao publicar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={parentId ? 2 : 3}
        autoFocus={autoFocus}
        disabled={pending}
        maxLength={2000}
        className="w-full resize-y rounded-lg border border-[var(--border)] bg-surface-1 px-3.5 py-2.5 text-sm text-fg-hi outline-none transition-colors placeholder:text-fg-mut focus:border-brand"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || text.trim().length === 0}>
          {pending ? "Enviando…" : parentId ? "Responder" : "Comentar"}
        </Button>
        {onDone ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
        {error ? <span className="text-xs text-negative">{error}</span> : null}
        {text.length > 1600 ? (
          <span className="ml-auto text-xs tabular-nums text-fg-mut">{text.length}/2000</span>
        ) : null}
      </div>
    </form>
  );
}
