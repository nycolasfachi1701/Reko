import Link from "next/link";
import { Suspense } from "react";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { Logo } from "@/components/logo";
import { FeedSkeleton } from "@/components/feed/feed-skeleton";
import { VideoCard, type FeedVideo } from "@/components/feed/video-card";

export const dynamic = "force-dynamic";

async function FeedList({ userId }: { userId: string }) {
  const videos = await db.video.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { viewSessions: true } } },
  });

  const sessions = await db.viewSession.findMany({
    where: { userId, videoId: { in: videos.map((v) => v.id) } },
    select: { videoId: true, maxPositionSec: true, completed: true },
  });
  const byVideo = new Map(sessions.map((s) => [s.videoId, s]));
  const storage = getStorage();

  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-surface-1 p-12 text-center">
        <p className="text-fg-hi">Nenhum vídeo publicado ainda.</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-fg-lo">
          Assim que a sua equipe publicar um vídeo, ele aparece aqui.
        </p>
      </div>
    );
  }

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
      previewSrc: storage.playbackUrl(v.storageKey),
      durationSec: v.durationSec,
      views: v._count.viewSessions,
      publishedAt: (v.publishedAt ?? v.createdAt).toISOString(),
      isNew: !s,
      resumeRatio,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Logo />
        <Link
          href="/login"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          Área de gestão →
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand">
          Plataforma interna de vídeos
        </p>
        <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Assista aos vídeos da sua equipe, sem complicação.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-fg-lo">
          O acesso é por um link enviado pela sua equipe — sem senha e sem
          cadastro. Já tem um link? É só abri-lo.
        </p>
      </main>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Logo />
          {isManager ? (
            <Link
              href="/manage"
              className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
            >
              Área de gestão →
            </Link>
          ) : (
            <span className="text-sm text-fg-lo">Olá, {user.name.split(" ")[0]}</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-xl font-bold">Vídeos</h1>
        <Suspense fallback={<FeedSkeleton />}>
          <FeedList userId={user.id} />
        </Suspense>
      </main>
    </div>
  );
}
