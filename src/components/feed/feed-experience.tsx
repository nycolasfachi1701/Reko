"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDuration } from "@/lib/utils";
import { formatRelativeTime, formatViews } from "@/lib/format";
import { ThemeToggle } from "@/components/theme-toggle";

export interface FeedVideo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  views: number;
  publishedAt: string;
  isNew: boolean;
  resumeRatio: number | null;
  uploaderName: string;
  tags: string[];
}

const TONES = ["#20303a", "#2e2416", "#241f36", "#182a24", "#301a24", "#1e2438", "#2b2016", "#1c2a1e"];
const MONO_TINTS = ["#ff6a1a", "#3bb78f", "#7c6cff", "#e0658a", "#4a9be0", "#e0a13b"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "•";
}

function PlayGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Card({ v }: { v: FeedVideo }) {
  const tone = TONES[hash(v.id) % TONES.length];
  const tint = MONO_TINTS[hash(v.title) % MONO_TINTS.length];
  const mono = (v.title.match(/[A-Za-zÀ-ÿ0-9]/)?.[0] ?? "R").toUpperCase();

  return (
    <Link
      href={`/v/${v.id}`}
      className="rk-card group flex flex-col gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4"
    >
      <div
        className="rk-thumb"
        style={{ background: `linear-gradient(150deg, ${tone}, #0b0a09)` }}
      >
        {v.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="rk-mono" style={{ color: tint }}>
            {mono}
          </span>
        )}
        <span className="rk-play">
          <PlayGlyph />
        </span>
        {v.isNew ? <span className="rk-new">Novo</span> : null}
        <span className="rk-dur tabular-nums">{formatDuration(v.durationSec)}</span>
        {v.resumeRatio != null ? (
          <span className="rk-resume">
            <span style={{ width: `${Math.min(100, Math.round(v.resumeRatio * 100))}%` }} />
          </span>
        ) : null}
      </div>

      <div className="flex gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
          style={{ background: tint }}
          aria-hidden
        >
          {initials(v.uploaderName)}
        </span>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-fg-hi transition-colors group-hover:text-brand">
            {v.title}
          </h3>
          <p className="mt-1 text-[13px] text-fg-mut tabular-nums">
            {formatViews(v.views)} · {formatRelativeTime(new Date(v.publishedAt))}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function FeedExperience({
  videos,
  tags,
  user,
}: {
  videos: FeedVideo[];
  tags: string[];
  user: { name: string; isManager: boolean };
}) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("Todos");
  const [sort, setSort] = useState<"recent" | "views" | "az">("recent");

  const featured = useMemo(
    () => [...videos].sort((a, b) => b.views - a.views)[0] ?? null,
    [videos],
  );
  const showHero = q.trim() === "" && tag === "Todos" && featured != null;

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = videos.filter((v) => {
      const okTag = tag === "Todos" || v.tags.includes(tag);
      const okQ =
        !query ||
        v.title.toLowerCase().includes(query) ||
        v.tags.join(" ").toLowerCase().includes(query);
      return okTag && okQ;
    });
    if (sort === "views") out = [...out].sort((a, b) => b.views - a.views);
    else if (sort === "az") out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    else
      out = [...out].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    if (showHero && featured) out = out.filter((v) => v.id !== featured.id);
    return out;
  }, [videos, q, tag, sort, showHero, featured]);

  const allTags = ["Todos", ...tags];

  return (
    <div className="min-h-screen">
      <header className="rk-bar">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-5 px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Reko, por Nstech">
            <span className="rk-glyph" aria-hidden>
              R
            </span>
            <span className="font-display text-[22px] font-extrabold tracking-tight">
              Reko
              <span className="ml-2 font-sans text-xs font-medium text-fg-mut">por Nstech</span>
            </span>
          </Link>

          <div className="rk-search relative mx-auto hidden max-w-[460px] flex-1 sm:block">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-fg-mut"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título ou tag…"
              aria-label="Buscar vídeos"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {user.isManager ? (
              <Link
                href="/manage"
                className="hidden rounded-sm border border-[var(--border-strong)] bg-surface-1 px-3 py-2 text-sm text-fg-lo transition-colors hover:bg-surface-2 hover:text-fg-hi sm:block"
              >
                Gestão →
              </Link>
            ) : null}
            <span
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-strong)] text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#ff8a3d,#ff5a00)" }}
              title={user.name}
            >
              {initials(user.name)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rk-search relative py-4 sm:hidden">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-fg-mut"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar vídeos"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 py-5">
          <div className="flex flex-1 flex-wrap gap-2" role="group" aria-label="Filtrar por tag">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                className="rk-chip"
                aria-pressed={tag === t}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="rk-sort flex items-center gap-2 text-[13px] text-fg-mut">
            Ordenar
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Ordenar vídeos"
            >
              <option value="recent">Mais recentes</option>
              <option value="views">Mais vistos</option>
              <option value="az">Título (A–Z)</option>
            </select>
          </label>
        </div>

        {showHero && featured ? (
          <Link href={`/v/${featured.id}`} className="rk-hero mb-9 block animate-in">
            <span className="rk-hero-play" aria-hidden>
              <PlayGlyph size={26} />
            </span>
            <div className="relative z-[2] max-w-[620px] p-10">
              <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffb480]">
                <span className="h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_0_4px_rgba(255,102,0,0.25)]" />
                Em destaque
              </span>
              <h1 className="mb-3 font-display text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.03] tracking-tight text-white">
                {featured.title}
              </h1>
              <p className="mb-5 max-w-[46ch] text-[15px] text-[#d9d2c9]">
                {formatViews(featured.views)} · {formatDuration(featured.durationSec)} ·{" "}
                {formatRelativeTime(new Date(featured.publishedAt))}
              </p>
            </div>
          </Link>
        ) : null}

        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {tag === "Todos" ? "Todos os vídeos" : tag}
          </h2>
          <span className="text-[13px] text-fg-mut tabular-nums">
            {list.length} {list.length === 1 ? "vídeo" : "vídeos"}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-surface-1 p-16 text-center">
            <p className="font-semibold text-fg-hi">Nenhum vídeo encontrado</p>
            <p className="mt-1 text-sm text-fg-mut">Tente outra busca ou remova os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-[22px] gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <Card key={v.id} v={v} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
