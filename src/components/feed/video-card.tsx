"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useRef, useState } from "react";
import { formatDuration } from "@/lib/utils";
import { formatRelativeTime, formatViews } from "@/lib/format";

export interface FeedVideo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  previewSrc: string;
  durationSec: number;
  views: number;
  publishedAt: string; // ISO
  isNew: boolean;
  resumeRatio: number | null; // 0..1 quando há sessão em andamento
}

function canHover(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
  );
}

export function VideoCard({ video }: { video: FeedVideo }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewing, setPreviewing] = useState(false);

  function onNavigate(e: MouseEvent<HTMLAnchorElement>) {
    // Progressive enhancement: morfa a miniatura no player onde suportado.
    const href = `/v/${video.id}`;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (
      !e.metaKey &&
      !e.ctrlKey &&
      !reduce &&
      "startViewTransition" in document
    ) {
      e.preventDefault();
      (
        document as Document & {
          startViewTransition: (cb: () => void) => void;
        }
      ).startViewTransition(() => router.push(href));
    }
  }

  function startPreview() {
    if (!canHover()) return;
    const el = videoRef.current;
    if (!el) return;
    setPreviewing(true);
    if (!el.src) el.src = video.previewSrc; // preload="none" até o hover
    el.currentTime = 0;
    el.play().catch(() => setPreviewing(false));
    timerRef.current = setTimeout(() => {
      el.pause();
    }, 3000);
  }

  function stopPreview() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setPreviewing(false);
  }

  return (
    <Link
      href={`/v/${video.id}`}
      onClick={onNavigate}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      className="group flex flex-col gap-3 rounded-lg transition-transform duration-200 ease-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4 motion-safe:hover:-translate-y-1"
    >
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-2 shadow-sm ring-1 ring-[var(--border)] transition-shadow duration-200 group-hover:shadow-lg"
        style={{ viewTransitionName: `poster-${video.id}` }}
      >
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 ease-brand group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-fg-lo">
            sem capa
          </div>
        )}

        <video
          ref={videoRef}
          muted
          playsInline
          preload="none"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            previewing ? "opacity-100" : "opacity-0"
          }`}
        />

        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white tabular-nums">
          {formatDuration(video.durationSec)}
        </span>

        {video.isNew ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-brand px-1.5 py-0.5 text-xs font-semibold text-[#111]">
            Novo
          </span>
        ) : null}

        {video.resumeRatio != null ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div
              className="h-full bg-brand"
              style={{ width: `${Math.min(100, Math.round(video.resumeRatio * 100))}%` }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 font-medium leading-snug text-fg-hi group-hover:text-brand">
          {video.title}
        </h3>
        <p className="text-xs text-fg-lo tabular-nums">
          {formatViews(video.views)} · {formatRelativeTime(new Date(video.publishedAt))}
        </p>
      </div>
    </Link>
  );
}
