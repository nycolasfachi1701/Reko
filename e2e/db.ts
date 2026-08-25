import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Carrega .env (Playwright não injeta) antes de instanciar o Prisma.
try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2] ?? "";
  }
} catch {
  /* .env ausente: assume env já definido */
}

export const prisma = new PrismaClient();
