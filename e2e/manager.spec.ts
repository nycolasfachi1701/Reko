import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (b): gestor faz login, publica um vídeo e confere o bloco Visualizações.
test("gestor loga, publica vídeo e confere as métricas", async ({ page }) => {
  await prisma.video.update({
    where: { id: F.DRAFT_VIDEO_ID },
    data: { status: "DRAFT", publishedAt: null },
  });

  // login do gestor
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(F.MANAGER_EMAIL);
  await page.getByLabel("Senha").fill(F.MANAGER_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByRole("heading", { name: "Painel de desempenho" }),
  ).toBeVisible();

  // publica o rascunho
  await page.goto("/manage/videos");
  const row = page.getByTestId(`video-row-${F.DRAFT_VIDEO_ID}`);
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Publicar" }).click();
  // espera a publicação persistir e reflete via reload (render fresco)
  await expect
    .poll(async () => {
      const v = await prisma.video.findUnique({ where: { id: F.DRAFT_VIDEO_ID } });
      return v?.status;
    })
    .toBe("PUBLISHED");
  await page.reload();
  await expect(row.getByText("Publicado")).toBeVisible();

  // confere os três blocos no detalhe
  await page.goto(`/manage/videos/${F.DRAFT_VIDEO_ID}`);
  await expect(page.getByRole("heading", { name: "Visualizações" })).toBeVisible();
  await expect(page.getByText("Views (≥3s)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Percepção" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Expectativa" })).toBeVisible();

  // e que de fato ficou publicado no banco
  const v = await prisma.video.findUnique({ where: { id: F.DRAFT_VIDEO_ID } });
  expect(v?.status).toBe("PUBLISHED");

  // publicar invalida o cache do feed (revalidateTag): já aparece na home
  await page.goto("/");
  await expect(page.getByText(F.DRAFT_VIDEO_TITLE).first()).toBeVisible();
});
