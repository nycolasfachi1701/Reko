import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { buildTemplateWorkbook } from "@/lib/users-import";

export const dynamic = "force-dynamic";

// GET /manage/access/import/template — baixa o modelo (.xlsx) de importação.
export async function GET() {
  await requireRole([Role.ADMIN]);
  const xlsx = await buildTemplateWorkbook();
  return new NextResponse(Buffer.from(xlsx), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-usuarios-reko.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
