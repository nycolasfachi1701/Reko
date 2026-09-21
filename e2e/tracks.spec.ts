import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (e): gestor cria uma trilha, adiciona um vídeo, publica — e ela
// aparece no feed do espectador (cache invalidado via revalidateTag).
test("gestor cria trilha, adiciona vídeo e publica", async ({ page }) => {
  const title = `E2E Trilha ${Date.now()}`;
  const clean = () => prisma.track.deleteMany({ where: { title } });
  await clean();

  try {
    // login do gestor
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(F.MANAGER_EMAIL);
    await page.getByLabel("Senha").fill(F.MANAGER_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(
      page.getByRole("heading", { name: "Painel de desempenho" }),
    ).toBeVisible();

    // cria a trilha
    await page.goto("/manage/tracks");
    await page.getByLabel("Nome da trilha").fill(title);
    await page.getByRole("button", { name: "Criar trilha" }).click();
    await expect(page.getByRole("heading", { name: "Editar trilha" })).toBeVisible();

    // adiciona o vídeo publicado (seção "sem módulo")
    await page.getByRole("combobox").selectOption({ label: F.PUBLISHED_VIDEO_TITLE });
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText(F.PUBLISHED_VIDEO_TITLE).first()).toBeVisible();

    // publica
    await page.getByRole("button", { name: "Publicar" }).click();

    // persistiu: publicada, com 1 item
    await expect
      .poll(async () => {
        const t = await prisma.track.findFirst({
          where: { title },
          select: { status: true, _count: { select: { items: true } } },
        });
        return t ? `${t.status}:${t._count.items}` : "none";
      })
      .toBe("PUBLISHED:1");

    // aparece no feed (seção Trilhas)
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Trilhas" })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
  } finally {
    await clean();
  }
});
