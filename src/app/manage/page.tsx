import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { dashboardStats } from "@/lib/analytics-data";
import { variation } from "@/lib/analytics";
import { formatPercent, formatViews, formatWatchTime } from "@/lib/format";
import { Card } from "@/components/ui";
import { ManageHeader } from "./manage-header";
import { DashboardTable } from "./dashboard-table";

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90];

function VariationBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-fg-lo">sem base</span>;
  }
  const up = value >= 0;
  return (
    <span className={`text-xs tabular-nums ${up ? "text-positive" : "text-negative"}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(value * 100))}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  variationValue,
}: {
  label: string;
  value: string;
  variationValue: number | null;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-fg-lo">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-1">
        <VariationBadge value={variationValue} />
        <span className="text-xs text-fg-lo">vs. período anterior</span>
      </div>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);
  const { period: periodParam } = await searchParams;
  const period = PERIODS.includes(Number(periodParam)) ? Number(periodParam) : 30;

  const data = await dashboardStats(period);
  const { current: c, previous: p } = data;

  return (
    <>
      <ManageHeader user={user} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Painel de desempenho</h1>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-1">
            {PERIODS.map((d) => (
              <Link
                key={d}
                href={`/manage?period=${d}`}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  d === period
                    ? "bg-brand text-[#111]"
                    : "text-fg-lo hover:text-fg-hi"
                }`}
              >
                {d}d
              </Link>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Views"
            value={c.views.toLocaleString("pt-BR")}
            variationValue={variation(c.views, p.views)}
          />
          <KpiCard
            label="Tempo assistido"
            value={formatWatchTime(c.watchedSec)}
            variationValue={variation(c.watchedSec, p.watchedSec)}
          />
          <KpiCard
            label="Taxa de conclusão"
            value={formatPercent(c.completionRate)}
            variationValue={variation(c.completionRate, p.completionRate)}
          />
          <KpiCard
            label="Espectadores distintos"
            value={c.distinctViewers.toLocaleString("pt-BR")}
            variationValue={variation(c.distinctViewers, p.distinctViewers)}
          />
        </section>

        <div className="mt-10 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Vídeos</h2>
          <a
            href={`/api/manage/export/dashboard?period=${period}`}
            className="text-sm text-brand hover:underline"
          >
            Exportar CSV
          </a>
        </div>
        <Card className="mt-3 p-4">
          <DashboardTable rows={data.videos} />
        </Card>

        <p className="mt-4 text-xs text-fg-lo">
          Views contam sessões com pelo menos 3s assistidos. Período: últimos{" "}
          {period} dias · {formatViews(c.views)}.
        </p>
      </main>
    </>
  );
}
