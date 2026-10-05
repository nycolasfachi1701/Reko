import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo: admin importa usuários em massa por planilha. Uma linha válida é
// criada; linhas inválidas (e-mail ruim e e-mail repetido) viram erro.
test("admin importa usuários em massa por planilha", async ({ page }) => {
  const stamp = Date.now();
  const okEmail = `e2e-import-ok-${stamp}@reko.test`;
  const emails = [okEmail];

  const clean = async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  };
  await clean();

  // monta a planilha em memória (Nome | E-mail | Papel)
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Usuários");
  ws.addRow(["Nome", "E-mail", "Papel"]);
  ws.addRow(["Importado OK", okEmail, "Gestor"]);
  ws.addRow(["Email Ruim", "nao-e-email", "Espectador"]);
  ws.addRow(["Duplicado", okEmail, "Espectador"]);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  try {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(F.ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(F.ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(
      page.getByRole("heading", { name: "Painel de desempenho" }),
    ).toBeVisible();

    await page.goto("/manage/access");
    await page.locator('input[type="file"]').setInputFiles({
      name: "importacao.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
    await page.getByRole("button", { name: "Importar" }).click();

    // resumo: 1 criado, 2 com erro
    await expect(page.getByText(/1 criado/)).toBeVisible();
    await expect(page.getByText(/2 com erro/)).toBeVisible();

    // persistiu com o papel certo
    await expect
      .poll(async () => {
        const u = await prisma.user.findUnique({ where: { email: okEmail } });
        return u?.role ?? "none";
      })
      .toBe("MANAGER");
  } finally {
    await clean();
  }
});
