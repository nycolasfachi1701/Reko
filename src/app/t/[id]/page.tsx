import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, TrackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  video: { id: string; title: string; durationSec: number };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const track = await db.track.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { video: { select: { id: true, title: true, durationSec: true } } },
          },
        },
      },
      items: {
        where: { moduleId: null },
        orderBy: { order: "asc" },
        include: { video: { select: { id: true, title: true, durationSec: true } } },
      },
    },
  });
  if (!track) notFound();

  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN;
  if (track.status !== TrackStatus.PUBLISHED && !isManager) notFound();

  const totalVideos =
    track.modules.reduce((n, m) => n + m.items.length, 0) + track.items.length;

  // numeração contínua ao longo da trilha (aula 1..N)
  let n = 0;
  const VideoRow = (it: Row) => {
    n += 1;
    return (
      <Link
        key={it.id}
        href={`/v/${it.video.id}?track=${track.id}`}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold tabular-nums text-fg-lo">
          {n}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg-hi transition-colors group-hover:text-brand">
          {it.video.title}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-fg-mut">
          {formatDuration(it.video.durationSec)}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      <header className="rk-bar">
        <div className="mx-auto flex h-[68px] max-w-4xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Reko">
            <span className="rk-glyph" aria-hidden>
              R
            </span>
            <span className="font-display text-[20px] font-extrabold tracking-tight">
              Reko            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="text-sm text-fg-lo transition-colors hover:text-fg-hi">
              ← Voltar
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {track.status !== TrackStatus.PUBLISHED ? (
          <p className="mb-3 inline-block rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs text-brand">
            Prévia — esta trilha ainda não está publicada.
          </p>
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Trilha</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {track.title}
        </h1>
        <p className="mt-2 text-sm text-fg-mut tabular-nums">
          {totalVideos} {totalVideos === 1 ? "vídeo" : "vídeos"}
        </p>
        {track.description ? (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-fg-lo">
            {track.description}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-6">
          {track.modules.map((m) => (
            <section key={m.id}>
              <h2 className="mb-2 font-display text-lg font-bold">{m.title}</h2>
              <div className="rk-surface flex flex-col rounded-xl p-1.5">
                {m.items.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-fg-mut">Sem vídeos neste módulo.</p>
                ) : (
                  m.items.map((it) => VideoRow(it))
                )}
              </div>
            </section>
          ))}

          {track.items.length > 0 ? (
            <section>
              {track.modules.length > 0 ? (
                <h2 className="mb-2 font-display text-lg font-bold">Outros vídeos</h2>
              ) : null}
              <div className="rk-surface flex flex-col rounded-xl p-1.5">
                {track.items.map((it) => VideoRow(it))}
              </div>
            </section>
          ) : null}

          {totalVideos === 0 ? (
            <p className="text-sm text-fg-mut">Esta trilha ainda não tem vídeos.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
