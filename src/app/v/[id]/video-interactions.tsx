"use client";

import { type CSSProperties, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VoteValue } from "@prisma/client";
import { cn } from "@/lib/utils";
import { toggleVote, toggleReaction } from "./actions";

type Vote = "LIKE" | "DISLIKE" | null;

export interface ReactionState {
  emoji: string;
  count: number;
  mine: boolean;
}

const tint = (color: string, pct: number): CSSProperties => ({
  backgroundColor: `color-mix(in srgb, ${color} ${pct}%, transparent)`,
});

export function VideoInteractions({
  videoId,
  like,
  dislike,
  myVote,
  reactions,
}: {
  videoId: string;
  like: number;
  dislike: number;
  myVote: Vote;
  reactions: ReactionState[];
}) {
  const router = useRouter();
  const [vote, setVote] = useState<Vote>(myVote);
  const [likes, setLikes] = useState(like);
  const [dislikes, setDislikes] = useState(dislike);
  const [reacts, setReacts] = useState<ReactionState[]>(reactions);
  const [, start] = useTransition();

  function clickVote(value: "LIKE" | "DISLIKE") {
    // snapshot para reverter caso a action falhe (rede/permissão)
    const prev = { vote, likes, dislikes };
    setLikes((n) => n - (vote === "LIKE" ? 1 : 0) + (value === "LIKE" && vote !== "LIKE" ? 1 : 0));
    setDislikes(
      (n) => n - (vote === "DISLIKE" ? 1 : 0) + (value === "DISLIKE" && vote !== "DISLIKE" ? 1 : 0),
    );
    setVote((v) => (v === value ? null : value));
    start(async () => {
      try {
        await toggleVote(videoId, value as VoteValue);
      } catch {
        setVote(prev.vote);
        setLikes(prev.likes);
        setDislikes(prev.dislikes);
        router.refresh();
      }
    });
  }

  function clickReaction(emoji: string) {
    const prev = reacts;
    setReacts((rs) =>
      rs.map((r) =>
        r.emoji === emoji ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) } : r,
      ),
    );
    start(async () => {
      try {
        await toggleReaction(videoId, emoji);
      } catch {
        setReacts(prev);
        router.refresh();
      }
    });
  }

  const likeActive = vote === "LIKE";
  const dislikeActive = vote === "DISLIKE";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {/* Votos */}
      <div className="rk-glass inline-flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={() => clickVote("LIKE")}
          aria-pressed={likeActive}
          aria-label="Gostei"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
            likeActive ? "font-medium" : "text-fg-lo hover:bg-surface-2 hover:text-fg-hi",
          )}
          style={likeActive ? { ...tint("var(--brand)", 15), color: "var(--brand)" } : undefined}
        >
          <ThumbIcon />
          <span className="tabular-nums">{likes}</span>
        </button>
        <span className="h-4 w-px bg-[var(--border)]" aria-hidden />
        <button
          type="button"
          onClick={() => clickVote("DISLIKE")}
          aria-pressed={dislikeActive}
          aria-label="Não gostei"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
            dislikeActive ? "font-medium" : "text-fg-lo hover:bg-surface-2 hover:text-fg-hi",
          )}
          style={
            dislikeActive ? { ...tint("var(--negative)", 15), color: "var(--negative)" } : undefined
          }
        >
          <ThumbIcon down />
          <span className="tabular-nums">{dislikes}</span>
        </button>
      </div>

      {/* Reações */}
      <div className="flex flex-wrap items-center gap-1.5">
        {reacts.map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={() => clickReaction(r.emoji)}
            aria-pressed={r.mine}
            aria-label={`Reagir com ${r.emoji}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
              r.mine
                ? "text-fg-hi"
                : "border-[var(--border)] bg-surface-1 text-fg-lo hover:bg-surface-2",
            )}
            style={
              r.mine
                ? {
                    ...tint("var(--brand)", 10),
                    borderColor: "color-mix(in srgb, var(--brand) 45%, transparent)",
                  }
                : undefined
            }
          >
            <span aria-hidden>{r.emoji}</span>
            {r.count > 0 ? <span className="tabular-nums text-xs">{r.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThumbIcon({ down }: { down?: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={down ? "rotate-180" : undefined}
    >
      <path d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" />
    </svg>
  );
}
