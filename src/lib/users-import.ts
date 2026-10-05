import { randomBytes } from "node:crypto";
import ExcelJS from "exceljs";
import { Role } from "@prisma/client";

// Importação de usuários em massa via planilha (.xlsx). Módulo puro (sem
// "server-only"); usa exceljs (JS puro) e crypto nativo. Colunas do modelo:
// Nome | E-mail | Papel. A senha é gerada automaticamente na importação.

export const IMPORT_COLUMNS = ["Nome", "E-mail", "Papel"] as const;

export const ROLE_LABEL_PT: Record<Role, string> = {
  VIEWER: "Espectador",
  MANAGER: "Gestor",
  ADMIN: "Administrador",
};

/** Interpreta o papel aceitando rótulos em pt-BR ou os valores do enum. */
export function parseRole(raw: string): Role | null {
  const v = raw.trim().toLowerCase();
  if (v === "") return Role.VIEWER; // padrão
  if (["viewer", "espectador", "espectadora"].includes(v)) return Role.VIEWER;
  if (["manager", "gestor", "gestora"].includes(v)) return Role.MANAGER;
  if (["admin", "administrador", "administradora", "administrator"].includes(v)) {
    return Role.ADMIN;
  }
  return null;
}

// Alfabeto sem caracteres ambíguos (0/O, 1/I/l) para a senha temporária.
const PWD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateTempPassword(len = 12): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += PWD_ALPHABET[bytes[i]! % PWD_ALPHABET.length]!;
  }
  return out;
}

export interface ParsedRow {
  line: number; // número da linha na planilha (para mensagens de erro)
  name: string;
  email: string;
  roleRaw: string;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell?.value as unknown;
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    }
    if (typeof o.text === "string") return o.text; // hyperlink
    if ("result" in o) return String(o.result ?? ""); // fórmula
    return "";
  }
  return String(v).trim();
}

/** Lê as linhas de dados (ignora cabeçalho e linhas vazias). */
export async function parseUsersWorkbook(
  data: Buffer | ArrayBuffer,
): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs tipa o parâmetro com um Buffer antigo; o Buffer do Node novo é
  // genérico e não casa. O valor é aceito em runtime.
  await wb.xlsx.load(data as never);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: ParsedRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho
    const name = cellText(row.getCell(1));
    const email = cellText(row.getCell(2)).toLowerCase();
    const roleRaw = cellText(row.getCell(3));
    if (!name && !email && !roleRaw) return; // linha vazia
    rows.push({ line: rowNumber, name, email, roleRaw });
  });
  return rows;
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.eachCell((c) => {
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF6600" },
    };
  });
  header.height = 20;
}

/** Gera o modelo (.xlsx) para o admin preencher. */
export async function buildTemplateWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Reko";

  const ws = wb.addWorksheet("Usuários");
  ws.columns = [
    { header: "Nome", key: "name", width: 28 },
    { header: "E-mail", key: "email", width: 34 },
    { header: "Papel", key: "role", width: 18 },
  ];
  styleHeader(ws);
  ws.addRow({ name: "Maria Silva", email: "maria@nstech.com.br", role: "Espectador" });
  ws.addRow({ name: "João Souza", email: "joao@nstech.com.br", role: "Gestor" });

  // Dropdown de papel nas linhas de dados
  for (let r = 2; r <= 500; r++) {
    ws.getCell(`C${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Espectador,Gestor,Administrador"'],
    };
  }

  const info = wb.addWorksheet("Instruções");
  info.getColumn(1).width = 95;
  [
    "Como usar este modelo:",
    '1. Preencha uma linha por usuário na aba "Usuários".',
    "2. Nome: nome completo (mínimo 2 caracteres).",
    "3. E-mail: e-mail único e válido — será o login da pessoa.",
    "4. Papel: Espectador, Gestor ou Administrador (se vazio, assume Espectador).",
    "5. NÃO preencha senha: ela é gerada automaticamente na importação.",
    "6. Salve e envie em Gestão > Usuários > Importar em massa.",
    "7. Ao final, baixe a planilha de resultado com as senhas temporárias e distribua.",
    "",
    "As duas linhas de exemplo podem ser apagadas antes de enviar.",
  ].forEach((t) => info.addRow([t]));
  info.getRow(1).font = { bold: true };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface ResultRow {
  name: string;
  email: string;
  role: string;
  status: string;
  password?: string;
}

/** Gera a planilha de resultado (status por linha + senha temporária). */
export async function buildResultWorkbook(rows: ResultRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Reko";
  const ws = wb.addWorksheet("Resultado");
  ws.columns = [
    { header: "Nome", key: "name", width: 28 },
    { header: "E-mail", key: "email", width: 34 },
    { header: "Papel", key: "role", width: 16 },
    { header: "Status", key: "status", width: 28 },
    { header: "Senha temporária", key: "password", width: 20 },
  ];
  styleHeader(ws);
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
