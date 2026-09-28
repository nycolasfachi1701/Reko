import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FeedExperience,
  type FeedVideo,
  type FeedTrack,
} from "@/components/feed/feed-experience";

const MIN_VIEW_SECONDS = 3;

// Parte compartilhada do feed (igual para todos): lista de publicados +
// contagem de views + tags. Cara e não-personalizada → cacheada no Data Cache
// (revalida por tempo ou via revalidateTag("feed") quando o catálogo muda).
type FeedBase = Omit<FeedVideo, "isNew" | "resumeRatio">;

const getPublishedFeed = unstable_cache(
  async (): Promise<{ items: FeedBase[]; tags: string[] }> => {
    const videos = await db.video.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { tags: true, uploadedBy: { select: { name: true } } },
    });
    const ids = videos.map((v) => v.id);
    const counts = ids.length
      ? await db.viewSession.groupBy({
          by: ["videoId"],
          where: { videoId: { in: ids }, watchedSeconds: { gte: MIN_VIEW_SECONDS } },
          _count: { _all: true },
        })
      : [];
    const viewsByVideo = new Map(counts.map((c) => [c.videoId, c._count._all]));

    const items: FeedBase[] = videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.durationSec,
      views: viewsByVideo.get(v.id) ?? 0,
      publishedAt: (v.publishedAt ?? v.createdAt).toISOString(),
      uploaderName: v.uploadedBy.name,
      tags: v.tags.map((t) => t.tag),
    }));

    // tags mais frequentes (rótulo para os chips)
    const freq = new Map<string, number>();
    for (const v of items) for (const t of v.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    const tags = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);

    return { items, tags };
  },
  ["published-feed"],
  { revalidate: 60, tags: ["feed"] },
);

// Trilhas publicadas — parte compartilhada, cacheada (invalida via
// revalidateTag("tracks")). Traz os videoIds para o progresso por usuário.
interface TrackBase {
  id: string;
  title: string;
  coverUrl: string | null;
  videoIds: string[];
}
const getPublishedTracks = unstable_cache(
  async (): Promise<TrackBase[]> => {
    const tracks = await db.track.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        coverUrl: true,
        items: { select: { videoId: true } },
      },
    });
    return tracks.map((t) => ({
      id: t.id,
      title: t.title,
      coverUrl: t.coverUrl,
      videoIds: t.items.map((i) => i.videoId),
    }));
  },
  ["published-tracks"],
  { revalidate: 60, tags: ["tracks"] },
);

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2.5">
          <span className="rk-glyph" aria-hidden>
            R
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight">
            Reko          </span>
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

  // Compartilhado (cacheado) + overlay por usuário (dinâmico, leve) em paralelo.
  const [{ items: base, tags }, tracks, sessions] = await Promise.all([
    getPublishedFeed(),
    getPublishedTracks(),
    db.viewSession.findMany({
      where: { userId: user.id, video: { status: "PUBLISHED" } },
      select: { videoId: true, maxPositionSec: true, completed: true },
    }),
  ]);
  const byVideo = new Map(sessions.map((s) => [s.videoId, s]));

  // progresso das trilhas: reaproveita as sessões (vídeos concluídos do usuário)
  const completedSet = new Set(
    sessions.filter((s) => s.completed).map((s) => s.videoId),
  );
  const feedTracks: FeedTrack[] = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    coverUrl: t.coverUrl,
    videoCount: t.videoIds.length,
    completedCount: t.videoIds.filter((v) => completedSet.has(v)).length,
  }));

  const items: FeedVideo[] = base.map((v) => {
    const s = byVideo.get(v.id);
    const resumeRatio =
      s && !s.completed && v.durationSec > 0 && s.maxPositionSec / v.durationSec > 0.05
        ? s.maxPositionSec / v.durationSec
        : null;
    return { ...v, isNew: !s, resumeRatio };
  });

  return (
    <FeedExperience
      videos={items}
      tags={tags}
      tracks={feedTracks}
      user={{ name: user.name, isManager: user.role !== Role.VIEWER }}
    />
  );
}
