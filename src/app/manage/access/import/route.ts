import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-role";
import { hashPassword } from "@/lib/auth/password";
import {
  parseUsersWorkbook,
  parseRole,
  generateTempPassword,
  buildResultWorkbook,
  ROLE_LABEL_PT,
  type ParsedRow,
  type ResultRow,
} from "@/lib/users-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // criação em massa pode levar alguns segundos

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_ROWS = 1000;
const HASH_CONCURRENCY = 4; // scrypt é caro; limita o paralelismo

interface ImportError {
  line: number;
  email: string;
  reason: string;
}

type Plan =
  | { kind: "error"; row: ParsedRow; roleLabel: string; reason: string }
  | {
      kind: "ok";
      row: ParsedRow;
      role: Role;
      roleLabel: string;
      password: string;
      hash?: string;
    };

// map com concorrência limitada (não dispara 1000 scrypts de uma vez).
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>,
): Promise<R[]> {
  const ret = new Array<R>(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return ret;
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
  // teto baixo no arquivo COMPRIMIDO: um .xlsx de 1000 linhas × 3 colunas tem
  // dezenas de KB, então 2 MB é folgado e limita o pior caso de descompressão
  // (zip bomb) antes de o ExcelJS carregar tudo em memória.
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 2 MB)." }, { status: 400 });
  }

  let rows: ParsedRow[];
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

  // 1) valida cada linha (sem tocar no banco) e deduplica dentro do arquivo
  const seen = new Set<string>();
  const plans: Plan[] = rows.map((r) => {
    const role = parseRole(r.roleRaw);
    const roleLabel = role ? ROLE_LABEL_PT[role] : r.roleRaw;
    const err = (reason: string): Plan => ({ kind: "error", row: r, roleLabel, reason });
    if (r.name.trim().length < 2) return err("nome inválido");
    if (!EMAIL_RE.test(r.email)) return err("e-mail inválido");
    if (role === null) return err("papel inválido");
    if (seen.has(r.email)) return err("e-mail repetido na planilha");
    seen.add(r.email);
    return { kind: "ok", row: r, role, roleLabel, password: generateTempPassword() };
  });

  // 2) e-mails já cadastrados em UMA query (em vez de 1 erro por create)
  const candidateEmails = plans
    .filter((p): p is Extract<Plan, { kind: "ok" }> => p.kind === "ok")
    .map((p) => p.row.email);
  const existing = new Set(
    candidateEmails.length
      ? (
          await db.user.findMany({
            where: { email: { in: candidateEmails } },
            select: { email: true },
          })
        ).map((u) => u.email)
      : [],
  );
  const planned: Plan[] = plans.map((p) =>
    p.kind === "ok" && existing.has(p.row.email)
      ? { kind: "error", row: p.row, roleLabel: p.roleLabel, reason: "e-mail já cadastrado" }
      : p,
  );

  // 3) hash em paralelo (limitado) + inserção em lote
  const toCreate = planned.filter(
    (p): p is Extract<Plan, { kind: "ok" }> => p.kind === "ok",
  );
  const hashes = await mapLimit(toCreate, HASH_CONCURRENCY, (p) =>
    hashPassword(p.password),
  );
  toCreate.forEach((p, i) => {
    p.hash = hashes[i];
  });

  let created = 0;
  if (toCreate.length) {
    const res = await db.user.createMany({
      data: toCreate.map((p) => ({
        name: p.row.name.trim(),
        email: p.row.email,
        role: p.role,
        passwordHash: p.hash!,
      })),
      skipDuplicates: true,
    });
    created = res.count;
    revalidatePath("/manage/access");
  }

  // 4) resultado em ordem da planilha + lista de erros
  const errors: ImportError[] = [];
  const resultRows: ResultRow[] = planned.map((p) => {
    if (p.kind === "ok") {
      return {
        name: p.row.name.trim(),
        email: p.row.email,
        role: p.roleLabel,
        status: "Criado",
        password: p.password,
      };
    }
    errors.push({ line: p.row.line, email: p.row.email, reason: p.reason });
    return {
      name: p.row.name,
      email: p.row.email,
      role: p.roleLabel,
      status: `Erro: ${p.reason}`,
    };
  });

  const resultFile = await buildResultWorkbook(resultRows);

  return NextResponse.json({
    created,
    failed: errors.length,
    total: rows.length,
    errors: errors.slice(0, 50),
    resultFileBase64: resultFile.toString("base64"),
    resultFileName: "resultado-importacao-usuarios.xlsx",
  });
}
