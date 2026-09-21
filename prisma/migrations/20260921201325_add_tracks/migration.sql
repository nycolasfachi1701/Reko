-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverUrl" TEXT,
    "status" "TrackStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackModule" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrackModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackItem" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "moduleId" TEXT,
    "videoId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrackItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_status_publishedAt_idx" ON "Track"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "TrackModule_trackId_order_idx" ON "TrackModule"("trackId", "order");

-- CreateIndex
CREATE INDEX "TrackItem_trackId_order_idx" ON "TrackItem"("trackId", "order");

-- CreateIndex
CREATE INDEX "TrackItem_moduleId_order_idx" ON "TrackItem"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TrackItem_trackId_videoId_key" ON "TrackItem"("trackId", "videoId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackModule" ADD CONSTRAINT "TrackModule_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackItem" ADD CONSTRAINT "TrackItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackItem" ADD CONSTRAINT "TrackItem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrackModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackItem" ADD CONSTRAINT "TrackItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
