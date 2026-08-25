import { PrismaClient, Role, VideoStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Senha do admin apenas para DESENVOLVIMENTO. Documentada no README.
// Hash com bcrypt (cost 12) — fallback aceito pelo SPEC §4.2; a Fase 2
// confirma Argon2id conforme o ambiente de deploy.
const DEV_ADMIN_EMAIL = "nycolas.fachi@nstech.com.br";
const DEV_ADMIN_PASSWORD = "admin1234";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 12);

  // --- 1 admin --------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    update: { role: Role.ADMIN, passwordHash, name: "Administrador Nstech" },
    create: {
      email: DEV_ADMIN_EMAIL,
      name: "Administrador Nstech",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  // --- 2 espectadores (sem e-mail / sem senha) ------------------------------
  const viewer1 = await prisma.user.upsert({
    where: { id: "seed-viewer-1" },
    update: { name: "Ana Espectadora", role: Role.VIEWER },
    create: { id: "seed-viewer-1", name: "Ana Espectadora", role: Role.VIEWER },
  });
  const viewer2 = await prisma.user.upsert({
    where: { id: "seed-viewer-2" },
    update: { name: "Bruno Espectador", role: Role.VIEWER },
    create: { id: "seed-viewer-2", name: "Bruno Espectador", role: Role.VIEWER },
  });

  // --- 3 vídeos fake (publicados) -------------------------------------------
  const videos = [
    {
      id: "seed-video-1",
      title: "Onboarding Nstech — primeiros passos na plataforma",
      description:
        "Uma visão geral de como a plataforma funciona, do login ao primeiro vídeo assistido.",
      durationSec: 312,
      publishedAt: daysAgo(21),
      targetViews: 2000,
      expectedCompletionRate: 0.65,
      tags: ["onboarding", "institucional"],
    },
    {
      id: "seed-video-2",
      title: "CIOT ANTT na prática — classificação e piso mínimo",
      description:
        "Como classificar o CIOT corretamente e validar o piso mínimo de frete em operações de frota própria.",
      durationSec: 734,
      publishedAt: daysAgo(9),
      targetViews: 1500,
      expectedCompletionRate: 0.55,
      tags: ["ciot", "antt", "operacional"],
    },
    {
      id: "seed-video-3",
      title: "Novidades do produto — release de agosto",
      description:
        "Um tour rápido pelas melhorias entregues neste ciclo, com foco no portal do cliente.",
      durationSec: 178,
      publishedAt: daysAgo(2),
      targetViews: 800,
      expectedCompletionRate: 0.7,
      tags: ["release", "produto"],
    },
  ];

  for (const v of videos) {
    const { tags, ...data } = v;
    await prisma.video.upsert({
      where: { id: v.id },
      update: {
        ...data,
        status: VideoStatus.PUBLISHED,
        uploadedById: admin.id,
      },
      create: {
        ...data,
        status: VideoStatus.PUBLISHED,
        uploadedById: admin.id,
        storageKey: `seed/${v.id}.mp4`,
        thumbnailUrl: null,
      },
    });

    // tags (idempotente pela PK composta)
    for (const tag of tags) {
      await prisma.videoTag.upsert({
        where: { videoId_tag: { videoId: v.id, tag } },
        update: {},
        create: { videoId: v.id, tag },
      });
    }
  }

  console.log("Seed concluído:");
  console.log(`  admin:      ${admin.email} (senha dev: ${DEV_ADMIN_PASSWORD})`);
  console.log(`  viewers:    ${viewer1.name}, ${viewer2.name}`);
  console.log(`  vídeos:     ${videos.length} publicados`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
