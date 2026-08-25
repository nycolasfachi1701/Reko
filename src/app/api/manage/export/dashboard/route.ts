import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { dashboardStats } from "@/lib/analytics-data";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.MANAGER && user.role !== Role.ADMIN)) {
    return new Response("Não autorizado", { status: 403 });
  }

  const periodParam = Number(new URL(req.url).searchParams.get("period"));
  const period = PERIODS.includes(periodParam) ? periodParam : 30;
  const data = await dashboardStats(period);

  const rows: (string | number)[][] = [
    ["Vídeo", "Status", "Views (período)"],
    ...data.videos.map((v) => [v.title, v.status, v.views]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="painel-${period}d.csv"`,
    },
  });
}
