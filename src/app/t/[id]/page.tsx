import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, TrackStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { formatDuration, cn } from "@/lib/utils";
import { completedAmong } from "@/lib/tracks-progress";

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

  // progresso (deriva de ViewSession.completed)
  const flat = [...track.modules.flatMap((m) => m.items), ...track.items];
  const completed = await completedAmong(
    user.id,
    flat.map((it) => it.video.id),
  );
  const completedCount = flat.filter((it) => completed.has(it.video.id)).length;
  const next = flat.find((it) => !completed.has(it.video.id));
  const pct = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  // atribuição (obrigatoriedade) para este usuário
  const assignment = await db.trackAssignment.findUnique({
    where: { trackId_userId: { trackId: id, userId: user.id } },
    select: { dueDate: true },
  });
  const overdue =
    assignment?.dueDate != null &&
    completedCount < totalVideos &&
    new Date(assignment.dueDate) < new Date();

  // numeração contínua ao longo da trilha (aula 1..N)
  let n = 0;
  const VideoRow = (it: Row) => {
    n += 1;
    const done = completed.has(it.video.id);
    return (
      <Link
        key={it.id}
        href={`/v/${it.video.id}?track=${track.id}`}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
      >
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
            done ? "" : "bg-surface-2 text-fg-lo",
          )}
          style={
            done
              ? { background: "color-mix(in srgb, var(--positive) 18%, transparent)", color: "var(--positive)" }
              : undefined
          }
        >
          {done ? "✓" : n}
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

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Trilha</p>
          {assignment ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--on-brand)]"
              style={{ background: "var(--brand)" }}
            >
              Obrigatória
            </span>
          ) : null}
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {track.title}
        </h1>
        <p className="mt-2 text-sm tabular-nums">
          <span className="text-fg-mut">
            {totalVideos} {totalVideos === 1 ? "vídeo" : "vídeos"}
          </span>
          {assignment?.dueDate ? (
            <span className={overdue ? "text-negative" : "text-fg-mut"}>
              {" · prazo "}
              {new Date(assignment.dueDate).toLocaleDateString("pt-BR")}
              {overdue ? " (vencido)" : ""}
            </span>
          ) : null}
        </p>
        {track.description ? (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-fg-lo">
            {track.description}
          </p>
        ) : null}

        {totalVideos > 0 ? (
          <div className="mt-5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm tabular-nums text-fg-lo">
                {completedCount} de {totalVideos} concluídos · {pct}%
              </span>
              {next ? (
                <Link
                  href={`/v/${next.video.id}?track=${track.id}`}
                  className="inline-flex items-center rounded-sm bg-brand px-4 py-2 text-sm font-medium text-[var(--on-brand)] transition-colors hover:bg-brand-strong"
                >
                  {completedCount === 0 ? "Começar trilha" : "Continuar"}
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-positive">
                    Trilha concluída ✓
                  </span>
                  <a
                    href={`/t/${track.id}/certificate`}
                    className="inline-flex items-center gap-2 rounded-sm border border-[var(--border-strong)] bg-surface-1 px-4 py-2 text-sm font-medium text-fg-hi transition-colors hover:bg-surface-2"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                    Baixar certificado
                  </a>
                </div>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          </div>
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
