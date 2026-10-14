import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

const VTT = `WEBVTT

00:00:00.000 --> 00:00:02.000
Olá, isto é um teste de legenda.
`;

// Fluxo: admin envia uma legenda (.vtt) para um vídeo publicado; ela persiste,
// é servida como text/vtt e o player passa a exibir o botão de legendas.
test("admin envia legenda e o player mostra o botão CC", async ({ page }) => {
  const clean = async () => {
    await prisma.video
      .update({ where: { id: F.PUBLISHED_VIDEO_ID }, data: { captionsKey: null } })
      .catch(() => {});
  };
  await clean();

  try {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(F.ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(F.ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(
      page.getByRole("heading", { name: "Painel de desempenho" }),
    ).toBeVisible();

    // edição do vídeo publicado → envia a legenda
    await page.goto(`/manage/videos/${F.PUBLISHED_VIDEO_ID}/edit`);
    await page.locator('input[type="file"]').setInputFiles({
      name: "legenda.vtt",
      mimeType: "text/vtt",
      buffer: Buffer.from(VTT, "utf8"),
    });
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Legendas ativas neste vídeo.")).toBeVisible();

    // persistiu no banco
    await expect
      .poll(async () => {
        const v = await prisma.video.findUnique({
          where: { id: F.PUBLISHED_VIDEO_ID },
          select: { captionsKey: true },
        });
        return v?.captionsKey ?? null;
      })
      .not.toBeNull();

    // servida como text/vtt
    const res = await page.request.get(
      `/api/media/captions/${F.PUBLISHED_VIDEO_ID}.vtt`,
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/vtt");
    expect(await res.text()).toContain("WEBVTT");

    // player exibe o botão de legendas
    await page.goto(`/v/${F.PUBLISHED_VIDEO_ID}`);
    await expect(page.getByRole("button", { name: "Legendas" })).toBeVisible();
  } finally {
    await clean();
  }
});
