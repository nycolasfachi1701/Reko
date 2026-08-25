import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (a): espectador entra por link, abre o vídeo e a visualização é
// registrada. (Interações saíram do escopo — o espectador só assiste.)
test("espectador entra por link e a visualização é registrada", async ({ page }) => {
  // reaproveita o token (uso único) para o caso de re-execução
  await prisma.accessToken.update({
    where: { id: F.VIEWER_TOKEN_ID },
    data: { usedAt: null },
  });

  await page.goto(`/enter/${F.VIEWER_RAW_TOKEN}`);

  // caiu no feed do espectador
  await expect(page.getByRole("heading", { name: "Vídeos", exact: true })).toBeVisible();

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
});
