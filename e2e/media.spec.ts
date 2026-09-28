import { test, expect } from "@playwright/test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "./db";
import * as F from "./fixtures";

// Autorização de mídia: o arquivo de um vídeo em RASCUNHO não pode ser baixado
// por espectador (404), mas o gestor consegue (prévia, 200).
const DRAFT_ID = "e2e-media-draft";
const REL = "e2e/media-draft.mp4";

function storageRoot(): string {
  const dir = process.env.LOCAL_STORAGE_DIR?.trim();
  return dir ? dir : join(process.cwd(), "storage");
}

test("mídia de rascunho: espectador 404, gestor 200", async ({ browser }) => {
  const filePath = join(storageRoot(), "e2e", "media-draft.mp4");
  await mkdir(join(storageRoot(), "e2e"), { recursive: true });
  await writeFile(filePath, Buffer.from("bytes-fake-para-e2e"));
  await prisma.video.upsert({
    where: { id: DRAFT_ID },
    update: { status: "DRAFT", storageKey: REL },
    create: {
      id: DRAFT_ID,
      title: "E2E Mídia Rascunho",
      description: "x",
      storageKey: REL,
      durationSec: 10,
      status: "DRAFT",
      uploadedById: F.MANAGER_USER_ID,
    },
  });

  try {
    // Espectador: bloqueado (404, sem revelar existência).
    const vCtx = await browser.newContext();
    const vPage = await vCtx.newPage();
    await vPage.goto("/login");
    await vPage.getByLabel("E-mail").fill(F.VIEWER_EMAIL);
    await vPage.getByLabel("Senha").fill(F.VIEWER_PASSWORD);
    await vPage.getByRole("button", { name: "Entrar" }).click();
    await expect(
      vPage.getByRole("link", { name: "Reko" }),
    ).toBeVisible();
    const vRes = await vPage.request.get(`/api/media/${REL}`);
    expect(vRes.status()).toBe(404);
    await vCtx.close();

    // Gestor: prévia permitida (200).
    const mCtx = await browser.newContext();
    const mPage = await mCtx.newPage();
    await mPage.goto("/login");
    await mPage.getByLabel("E-mail").fill(F.MANAGER_EMAIL);
    await mPage.getByLabel("Senha").fill(F.MANAGER_PASSWORD);
    await mPage.getByRole("button", { name: "Entrar" }).click();
    await expect(
      mPage.getByRole("heading", { name: "Painel de desempenho" }),
    ).toBeVisible();
    const mRes = await mPage.request.get(`/api/media/${REL}`);
    expect(mRes.status()).toBe(200);
    await mCtx.close();
  } finally {
    await prisma.video.delete({ where: { id: DRAFT_ID } }).catch(() => {});
    await rm(filePath, { force: true }).catch(() => {});
  }
});
