import { prisma } from "./db";
import * as F from "./fixtures";

export default async function globalTeardown() {
  const users = [F.VIEWER_USER_ID, F.MANAGER_USER_ID];

  // Ordem respeitando FKs sem cascade: vídeos (uploadedById) antes dos usuários.
  await prisma.video.deleteMany({
    where: { id: { in: [F.PUBLISHED_VIDEO_ID, F.DRAFT_VIDEO_ID] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}
