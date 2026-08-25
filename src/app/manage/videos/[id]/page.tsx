import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import {
  videoDetailStats,
  videoRetention,
  videoExpectativa,
} from "@/lib/analytics-data";
import { biggestDrops } from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { BarSeries } from "@/components/charts/bar-series";
import { RetentionChart } from "@/components/charts/retention-chart";
import { ManageHeader } from "../../manage-header";

export const dynamic = "force-dynamic";

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-fg-lo">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ExportLink({ videoId, block }: { videoId: string; block: string }) {
  return (
    <a
      href={`/api/manage/export/video/${videoId}?block=${block}`}
      className="text-sm text-brand hover:underline"
    >
      Exportar CSV
    </a>
  );
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);
  const { id } = await params;

  const video = await db.video.findUnique({
    where: { id },
    include: { tags: true, uploadedBy: { select: { name: true } } },
  });
  if (!video) notFound();

  const stats = await videoDetailStats(id);
  const ret = await videoRetention(id);
  const drops = biggestDrops(ret.raw, video.durationSec, 2);
  const publishedAt = video.publishedAt ?? video.createdAt;
  const exp = await videoExpectativa(id, publishedAt);

  const totalDevices = stats.devices.reduce((a, d) => a + d.count, 0);

  // Expectativa: guardrails de dias de dados
  const enoughForProjection = exp.daysElapsed >= 3;
  const projectionIndicative = exp.daysElapsed < 7;

  const targetGap =
    video.targetViews && video.targetViews > 0
      ? (exp.proj30.predicted - video.targetViews) / video.targetViews
      : null;

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/manage/videos"
          className="text-sm text-fg-lo transition-colors hover:text-fg-hi"
        >
          ← Voltar aos vídeos
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{video.title}</h1>
              <StatusBadge status={video.status} />
            </div>
            <p className="mt-1 text-sm text-fg-lo">
              {formatDuration(video.durationSec)} · publicado por{" "}
              {video.uploadedBy.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/v/${video.id}`}>
              <Button variant="secondary">Ver como espectador</Button>
            </Link>
            <Link href={`/manage/videos/${video.id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
          </div>
        </div>

        {/* ---- Bloco: Visualizações ---- */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Visualizações</h2>
            <ExportLink videoId={video.id} block="visualizacoes" />
          </div>
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Views (≥3s)" value={stats.views.toLocaleString("pt-BR")} />
              <Stat
                label="Espectadores distintos"
                value={stats.distinctViewers.toLocaleString("pt-BR")}
              />
              <Stat label="Tempo médio assistido" value={formatDuration(stats.avgWatchedSec)} />
              <Stat label="Taxa de conclusão" value={formatPercent(stats.completionRate)} />
            </div>

            <p className="mb-2 mt-6 text-sm font-medium text-fg-lo">
              Views por dia (30 dias)
            </p>
            <BarSeries data={stats.daily} />

            <p className="mb-2 mt-6 text-sm font-medium text-fg-lo">
              Por dispositivo
            </p>
            {totalDevices === 0 ? (
              <p className="text-sm text-fg-lo">Sem dados ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.devices.map((d) => (
                  <div key={d.device} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-fg-lo">
                      {DEVICE_LABEL[d.device] ?? d.device}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(d.count / totalDevices) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right tabular-nums">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* ---- Bloco: Percepção ---- */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Percepção</h2>
            <ExportLink videoId={video.id} block="percepcao" />
          </div>
          <Card className="p-5">
            <p className="mb-3 text-sm text-fg-lo">
              Curva de retenção — quanto da audiência continua assistindo em cada
              trecho. Os marcadores apontam onde o vídeo mais perde gente.
            </p>
            {ret.raw.length === 0 ? (
              <p className="text-sm text-fg-lo">
                Ainda sem dados de retenção. Eles aparecem após a agregação
                diária das visualizações.
              </p>
            ) : (
              <>
                <RetentionChart
                  values={ret.values}
                  durationSec={video.durationSec}
                  drops={drops}
                />
                {drops.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-1 text-sm">
                    {drops.map((d, i) => (
                      <li key={i} className="text-fg-lo">
                        <span className="text-negative">
                          −{Math.round(d.dropPct * 100)}%
                        </span>{" "}
                        em torno de {formatDuration(d.atSec)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </Card>
        </section>

        {/* ---- Bloco: Expectativa ---- */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Expectativa</h2>
            <ExportLink videoId={video.id} block="expectativa" />
          </div>
          <Card className="p-5">
            {!enoughForProjection ? (
              <p className="text-sm text-fg-lo">
                Dados insuficientes para projetar (menos de 3 dias desde a
                publicação). Views até agora: {exp.currentViews}.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Stat label="Views até agora" value={exp.currentViews.toLocaleString("pt-BR")} />
                  <Stat
                    label="Projeção 7 dias"
                    value={`${exp.proj7.predicted.toLocaleString("pt-BR")}`}
                  />
                  <Stat
                    label="Projeção 30 dias"
                    value={`${exp.proj30.predicted.toLocaleString("pt-BR")}`}
                  />
                </div>

                <p className="text-sm text-fg-lo">
                  Intervalo em 30 dias: {exp.proj30.min.toLocaleString("pt-BR")} –{" "}
                  {exp.proj30.max.toLocaleString("pt-BR")} views.
                </p>

                {video.targetViews && targetGap !== null ? (
                  <p className="text-sm">
                    Meta: {exp.currentViews.toLocaleString("pt-BR")} de{" "}
                    {video.targetViews.toLocaleString("pt-BR")} · projeção{" "}
                    {exp.proj30.predicted.toLocaleString("pt-BR")} em 30 dias ·{" "}
                    <span className={targetGap >= 0 ? "text-positive" : "text-negative"}>
                      {targetGap >= 0 ? "+" : "−"}
                      {Math.abs(Math.round(targetGap * 100))}%{" "}
                      {targetGap >= 0 ? "acima" : "abaixo"} da meta
                    </span>
                  </p>
                ) : null}

                {exp.peerAverage !== null ? (
                  <p className="text-sm text-fg-lo">
                    Comparação: nos primeiros {exp.daysElapsed} dias, os outros
                    vídeos tiveram em média {exp.peerAverage.toLocaleString("pt-BR")}{" "}
                    views (este: {exp.currentViews.toLocaleString("pt-BR")}).
                  </p>
                ) : null}

                <p className="rounded border border-[var(--border)] bg-surface-2 p-3 text-xs text-fg-lo">
                  Método: regressão linear simples sobre os views diários
                  acumulados · {exp.points.length}{" "}
                  {exp.points.length === 1 ? "ponto" : "pontos"} de dados.
                  {projectionIndicative
                    ? " Com menos de 7 dias de dados, a projeção é apenas indicativa."
                    : ""}
                </p>
              </div>
            )}
          </Card>
        </section>
      </main>
    </>
  );
}
