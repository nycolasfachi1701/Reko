import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import * as F from "./fixtures";

// Fluxo (e): gestor cria uma trilha, adiciona um vídeo, publica — e ela
// aparece no feed do espectador (cache invalidado via revalidateTag).
test("gestor cria trilha, adiciona vídeo e publica", async ({ page }) => {
  const title = `E2E Trilha ${Date.now()}`;
  const clean = async () => {
    await prisma.track.deleteMany({ where: { title } });
    await prisma.viewSession.deleteMany({
      where: { videoId: F.PUBLISHED_VIDEO_ID, userId: F.MANAGER_USER_ID },
    });
  };
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

    // aparece no feed, na área "Trilhas" (menu lateral)
    await page.goto("/");
    await page.getByRole("button", { name: "Trilhas" }).click();
    await expect(page.getByRole("heading", { name: "Trilhas" })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    // progresso: concluir o vídeo reflete na página da trilha (deriva de completed)
    const tr = await prisma.track.findFirst({ where: { title }, select: { id: true } });
    await prisma.viewSession.create({
      data: {
        videoId: F.PUBLISHED_VIDEO_ID,
        userId: F.MANAGER_USER_ID,
        watchedSeconds: 120,
        maxPositionSec: 120,
        completed: true,
        device: "desktop",
      },
    });
    await page.goto(`/t/${tr!.id}`);
    await expect(page.getByText("Trilha concluída ✓")).toBeVisible();

    // certificado (T4): botão visível e rota devolve um PDF
    await expect(
      page.getByRole("link", { name: "Baixar certificado" }),
    ).toBeVisible();
    const cert = await page.request.get(`/t/${tr!.id}/certificate`);
    expect(cert.status()).toBe(200);
    expect(cert.headers()["content-type"]).toContain("application/pdf");

    // atribuição: gestor atribui o espectador; ele entra no painel de conclusão
    await page.goto(`/manage/tracks/${tr!.id}`);
    await page
      .locator("label", { hasText: "E2E Espectador" })
      .getByRole("checkbox")
      .check();
    await page.getByRole("button", { name: /Atribuir/ }).click();
    await expect(page.getByText("Não iniciada")).toBeVisible();
    await expect
      .poll(() =>
        prisma.trackAssignment.count({
          where: { trackId: tr!.id, userId: F.VIEWER_USER_ID },
        }),
      )
      .toBe(1);
  } finally {
    await clean();
  }
});
