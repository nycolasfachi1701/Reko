import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (d): espectador curte e comenta um vídeo; ambos persistem.
test("espectador curte e comenta um vídeo", async ({ page }) => {
  const clean = () =>
    Promise.all([
      prisma.vote.deleteMany({
        where: { videoId: F.PUBLISHED_VIDEO_ID, userId: F.VIEWER_USER_ID },
      }),
      prisma.comment.deleteMany({
        where: { videoId: F.PUBLISHED_VIDEO_ID, userId: F.VIEWER_USER_ID },
      }),
    ]);
  await clean();

  // login do espectador
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(F.VIEWER_EMAIL);
  await page.getByLabel("Senha").fill(F.VIEWER_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByRole("link", { name: "Reko" }),
  ).toBeVisible();

  await page.goto(`/v/${F.PUBLISHED_VIDEO_ID}`);

  // curte
  await page.getByRole("button", { name: "Gostei", exact: true }).click();
  await expect
    .poll(() =>
      prisma.vote.count({
        where: {
          videoId: F.PUBLISHED_VIDEO_ID,
          userId: F.VIEWER_USER_ID,
          value: "LIKE",
        },
      }),
    )
    .toBe(1);

  // comenta
  const text = `Comentário E2E ${Date.now()}`;
  await page.getByPlaceholder("Escreva um comentário…").fill(text);
  await page.getByRole("button", { name: "Comentar" }).click();
  await expect(page.getByText(text)).toBeVisible();
  await expect
    .poll(() =>
      prisma.comment.count({
        where: { videoId: F.PUBLISHED_VIDEO_ID, userId: F.VIEWER_USER_ID },
      }),
    )
    .toBeGreaterThan(0);

  await clean();
});
