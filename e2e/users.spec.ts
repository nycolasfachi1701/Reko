import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (c): admin edita um usuário (nome + papel) e a mudança persiste.
// Usa um usuário-alvo próprio para não contaminar os outros specs.
const TARGET_ID = "e2e-edit-target";

test("admin edita um usuário: nome e papel persistem", async ({ page }) => {
  await prisma.user.upsert({
    where: { id: TARGET_ID },
    update: { name: "Alvo Edição", role: "VIEWER", email: "e2e-edit-target@reko.test" },
    create: {
      id: TARGET_ID,
      name: "Alvo Edição",
      role: "VIEWER",
      email: "e2e-edit-target@reko.test",
    },
  });

  try {
    // login do admin
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(F.ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(F.ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(
      page.getByRole("heading", { name: "Painel de desempenho" }),
    ).toBeVisible();

    // abre a edição e altera nome + papel
    await page.goto(`/manage/access/${TARGET_ID}/edit`);
    await page.getByLabel("Nome").fill("Alvo Editado");
    await page.getByLabel("Papel").selectOption("MANAGER");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    // voltou para a lista já com o novo nome
    await expect(page).toHaveURL(/\/manage\/access$/);
    await expect(page.getByText("Alvo Editado")).toBeVisible();

    // persistiu no banco
    const u = await prisma.user.findUnique({ where: { id: TARGET_ID } });
    expect(u?.name).toBe("Alvo Editado");
    expect(u?.role).toBe("MANAGER");
  } finally {
    await prisma.session.deleteMany({ where: { userId: TARGET_ID } });
    await prisma.user.delete({ where: { id: TARGET_ID } }).catch(() => {});
  }
});
