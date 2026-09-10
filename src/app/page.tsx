import Link from "next/link";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedExperience, type FeedVideo } from "@/components/feed/feed-experience";

export const dynamic = "force-dynamic";

const MIN_VIEW_SECONDS = 3;

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2.5">
          <span className="rk-glyph" aria-hidden>
            R
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight">
            Reko
            <span className="ml-2 font-sans text-xs font-medium text-fg-mut">por Nstech</span>
          </span>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-sm border border-[var(--border-strong)] bg-surface-1 px-3 py-2 text-sm text-fg-lo transition-colors hover:bg-surface-2 hover:text-fg-hi"
          >
            Entrar →
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand">
          Plataforma de vídeos da Nstech
        </p>
        <h1 className="max-w-3xl font-display text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.02] tracking-tight">
          Assista aos vídeos da sua equipe, sem complicação.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-fg-lo">
          Entre com o e-mail e a senha da sua conta Nstech. Ainda não tem acesso? Peça
          uma conta ao administrador da sua equipe.
        </p>
      </main>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const videos = await db.video.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { tags: true, uploadedBy: { select: { name: true } } },
  });
  const ids = videos.map((v) => v.id);

  const [sessions, counts] = await Promise.all([
    db.viewSession.findMany({
      where: { userId: user.id, videoId: { in: ids } },
      select: { videoId: true, maxPositionSec: true, completed: true },
    }),
    db.viewSession.groupBy({
      by: ["videoId"],
      where: { videoId: { in: ids }, watchedSeconds: { gte: MIN_VIEW_SECONDS } },
      _count: { _all: true },
    }),
  ]);
  const byVideo = new Map(sessions.map((s) => [s.videoId, s]));
  const viewsByVideo = new Map(counts.map((c) => [c.videoId, c._count._all]));

  const items: FeedVideo[] = videos.map((v) => {
    const s = byVideo.get(v.id);
    const resumeRatio =
      s && !s.completed && v.durationSec > 0 && s.maxPositionSec / v.durationSec > 0.05
        ? s.maxPositionSec / v.durationSec
        : null;
    return {
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.durationSec,
      views: viewsByVideo.get(v.id) ?? 0,
      publishedAt: (v.publishedAt ?? v.createdAt).toISOString(),
      isNew: !s,
      resumeRatio,
      uploaderName: v.uploadedBy.name,
      tags: v.tags.map((t) => t.tag),
    };
  });

  // tags mais frequentes (rótulo capitalizado para os chips)
  const freq = new Map<string, number>();
  for (const v of items) for (const t of v.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
  const tags = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);

  return (
    <FeedExperience
      videos={items}
      tags={tags}
      user={{ name: user.name, isManager: user.role !== Role.VIEWER }}
    />
  );
}
