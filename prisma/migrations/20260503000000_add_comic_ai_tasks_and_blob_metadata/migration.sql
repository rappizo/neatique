ALTER TABLE "ComicEpisodeAsset" ADD COLUMN "imageStorageKey" TEXT;
ALTER TABLE "ComicEpisodeAsset" ADD COLUMN "imageByteSize" INTEGER;
ALTER TABLE "ComicEpisodeAsset" ADD COLUMN "imageSha256" TEXT;

CREATE TABLE "ComicAiTask" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" TEXT NOT NULL,
    "result" TEXT,
    "errorMessage" TEXT,
    "episodeId" TEXT,
    "pageNumber" INTEGER,
    "targetId" TEXT,
    "sourceAssetId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicAiTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComicAiTask_status_createdAt_idx" ON "ComicAiTask"("status", "createdAt");
CREATE INDEX "ComicAiTask_episodeId_pageNumber_createdAt_idx" ON "ComicAiTask"("episodeId", "pageNumber", "createdAt");
CREATE INDEX "ComicAiTask_taskType_targetId_status_createdAt_idx" ON "ComicAiTask"("taskType", "targetId", "status", "createdAt");
CREATE INDEX "ComicAiTask_sourceAssetId_status_createdAt_idx" ON "ComicAiTask"("sourceAssetId", "status", "createdAt");
