import { PrismaClient, Role, VideoStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/scrypt";

const prisma = new PrismaClient();

// Senha do admin apenas para DESENVOLVIMENTO. Documentada no README.
// Hash com scrypt (crypto nativo do Node), igual ao usado no login (SPEC §4.2).
const DEV_ADMIN_EMAIL = "nycolas.fachi@nstech.com.br";
const DEV_ADMIN_PASSWORD = "admin1234";
// Todo usuário entra com e-mail+senha (inclusive espectadores). Senha dev única.
const DEV_VIEWER_PASSWORD = "viewer1234";

async function main() {
  const passwordHash = await hashPassword(DEV_ADMIN_PASSWORD);
  const viewerHash = await hashPassword(DEV_VIEWER_PASSWORD);

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

  // --- 2 espectadores (e-mail + senha, como todo usuário) -------------------
  const viewer1 = await prisma.user.upsert({
    where: { id: "seed-viewer-1" },
    update: { name: "Ana Espectadora", role: Role.VIEWER, email: "ana@nstech.com.br", passwordHash: viewerHash },
    create: { id: "seed-viewer-1", name: "Ana Espectadora", role: Role.VIEWER, email: "ana@nstech.com.br", passwordHash: viewerHash },
  });
  const viewer2 = await prisma.user.upsert({
    where: { id: "seed-viewer-2" },
    update: { name: "Bruno Espectador", role: Role.VIEWER, email: "bruno@nstech.com.br", passwordHash: viewerHash },
    create: { id: "seed-viewer-2", name: "Bruno Espectador", role: Role.VIEWER, email: "bruno@nstech.com.br", passwordHash: viewerHash },
  });

  // --- 3 vídeos de exemplo (RASCUNHO) --------------------------------------
  // Ficam como DRAFT de propósito: o espectador só vê o que o gestor PUBLICAR.
  // Assim o feed não é poluído por conteúdo de exemplo (que nem tem arquivo).
  const videos = [
    {
      id: "seed-video-1",
      title: "Onboarding Nstech — primeiros passos na plataforma",
      description:
        "Uma visão geral de como a plataforma funciona, do login ao primeiro vídeo assistido.",
      durationSec: 312,
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
        status: VideoStatus.DRAFT,
        publishedAt: null,
        uploadedById: admin.id,
      },
      create: {
        ...data,
        status: VideoStatus.DRAFT,
        publishedAt: null,
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
  console.log(`  viewers:    ${viewer1.email}, ${viewer2.email} (senha dev: ${DEV_VIEWER_PASSWORD})`);
  console.log(`  vídeos:     ${videos.length} em RASCUNHO (o gestor publica)`);
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
