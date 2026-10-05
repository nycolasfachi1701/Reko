import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import { hashPassword } from "@/lib/auth/password";
import {
  parseUsersWorkbook,
  parseRole,
  generateTempPassword,
  buildResultWorkbook,
  ROLE_LABEL_PT,
  type ResultRow,
} from "@/lib/users-import";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_ROWS = 1000;

interface ImportError {
  line: number;
  email: string;
  reason: string;
}

// POST /manage/access/import — recebe a planilha preenchida, cria os usuários
// válidos (com senha temporária gerada) e devolve resumo + planilha de resultado.
export async function POST(req: NextRequest) {
  await requireRole([Role.ADMIN]);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Envie um arquivo .xlsx." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 5 MB)." }, { status: 400 });
  }

  let rows;
  try {
    rows = await parseUsersWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler a planilha. Use o modelo .xlsx." },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "A planilha não tem linhas de usuários." },
      { status: 400 },
    );
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `A planilha tem ${rows.length} linhas; o limite é ${MAX_ROWS}.` },
      { status: 400 },
    );
  }

  const errors: ImportError[] = [];
  const resultRows: ResultRow[] = [];
  const seen = new Set<string>();
  let created = 0;

  for (const r of rows) {
    const role = parseRole(r.roleRaw);
    const roleLabel = role ? ROLE_LABEL_PT[role] : r.roleRaw;
    const fail = (reason: string) => {
      errors.push({ line: r.line, email: r.email, reason });
      resultRows.push({
        name: r.name,
        email: r.email,
        role: roleLabel,
        status: `Erro: ${reason}`,
      });
    };

    if (r.name.trim().length < 2) {
      fail("nome inválido");
      continue;
    }
    if (!EMAIL_RE.test(r.email)) {
      fail("e-mail inválido");
      continue;
    }
    if (role === null) {
      fail("papel inválido");
      continue;
    }
    if (seen.has(r.email)) {
      fail("e-mail repetido na planilha");
      continue;
    }
    seen.add(r.email);

    const password = generateTempPassword();
    try {
      await db.user.create({
        data: {
          name: r.name.trim(),
          email: r.email,
          role,
          passwordHash: await hashPassword(password),
        },
      });
      created += 1;
      resultRows.push({
        name: r.name.trim(),
        email: r.email,
        role: roleLabel,
        status: "Criado",
        password,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        fail("e-mail já cadastrado");
      } else {
        fail("erro ao criar");
      }
    }
  }

  if (created > 0) revalidatePath("/manage/access");

  const resultFile = await buildResultWorkbook(resultRows);

  return NextResponse.json({
    created,
    failed: errors.length,
    total: rows.length,
    errors: errors.slice(0, 50), // evita payload gigante
    resultFileBase64: resultFile.toString("base64"),
    resultFileName: "resultado-importacao-usuarios.xlsx",
  });
}
