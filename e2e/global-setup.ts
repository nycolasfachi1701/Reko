import { createHash } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { prisma } from "./db";
import * as F from "./fixtures";

// Cria fixtures determinísticas para os fluxos E2E (SPEC §10, Fase 9).
export default async function globalSetup() {
  const passwordHash = await hash(F.MANAGER_PASSWORD);

  const manager = await prisma.user.upsert({
    where: { id: F.MANAGER_USER_ID },
    update: { email: F.MANAGER_EMAIL, passwordHash, role: "MANAGER", name: "E2E Gestor" },
    create: {
      id: F.MANAGER_USER_ID,
      email: F.MANAGER_EMAIL,
      passwordHash,
      role: "MANAGER",
      name: "E2E Gestor",
    },
  });

  await prisma.user.upsert({
    where: { id: F.VIEWER_USER_ID },
    update: { role: "VIEWER", name: "E2E Espectador" },
    create: { id: F.VIEWER_USER_ID, role: "VIEWER", name: "E2E Espectador" },
  });

  await prisma.video.upsert({
    where: { id: F.PUBLISHED_VIDEO_ID },
    update: { status: "PUBLISHED", publishedAt: new Date(), title: F.PUBLISHED_VIDEO_TITLE },
    create: {
      id: F.PUBLISHED_VIDEO_ID,
      title: F.PUBLISHED_VIDEO_TITLE,
      description: "Vídeo de teste E2E.",
      storageKey: "e2e/pub.mp4",
      durationSec: 60,
      status: "PUBLISHED",
      publishedAt: new Date(),
      uploadedById: manager.id,
    },
  });

  await prisma.video.upsert({
    where: { id: F.DRAFT_VIDEO_ID },
    update: { status: "DRAFT", publishedAt: null, title: F.DRAFT_VIDEO_TITLE },
    create: {
      id: F.DRAFT_VIDEO_ID,
      title: F.DRAFT_VIDEO_TITLE,
      description: "Rascunho de teste E2E.",
      storageKey: "e2e/draft.mp4",
      durationSec: 60,
      status: "DRAFT",
      uploadedById: manager.id,
    },
  });

  const tokenHash = createHash("sha256").update(F.VIEWER_RAW_TOKEN).digest("hex");
  await prisma.accessToken.upsert({
    where: { id: F.VIEWER_TOKEN_ID },
    update: { tokenHash, usedAt: null, expiresAt: new Date(Date.now() + 86400000), userId: F.VIEWER_USER_ID },
    create: {
      id: F.VIEWER_TOKEN_ID,
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000),
      userId: F.VIEWER_USER_ID,
      createdById: manager.id,
    },
  });

  // estado limpo
  await prisma.session.deleteMany({
    where: { userId: { in: [F.VIEWER_USER_ID, F.MANAGER_USER_ID] } },
  });
  await prisma.viewSession.deleteMany({
    where: { videoId: { in: [F.PUBLISHED_VIDEO_ID, F.DRAFT_VIDEO_ID] } },
  });
}
