import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (a): espectador faz login com e-mail+senha, cai no feed, abre o vídeo
// e a visualização é registrada. (Interações saíram do escopo — só assiste.)
test("espectador loga, abre o vídeo e a visualização é registrada", async ({ page }) => {
  // login do espectador
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(F.VIEWER_EMAIL);
  await page.getByLabel("Senha").fill(F.VIEWER_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  // caiu no feed do espectador (marca visível no topo)
  await expect(
    page.getByRole("link", { name: "Reko" }),
  ).toBeVisible();

  // abre o vídeo publicado
  await page.goto(`/v/${F.PUBLISHED_VIDEO_ID}`);
  await expect(page.locator("video")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: F.PUBLISHED_VIDEO_TITLE }),
  ).toBeVisible();

  // a abertura cria um ViewSession (telemetria)
  await expect
    .poll(
      () =>
        prisma.viewSession.count({
          where: { videoId: F.PUBLISHED_VIDEO_ID, userId: F.VIEWER_USER_ID },
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

  // logout disponível fora da gestão (feed/player): "Sair" leva ao login
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
});
