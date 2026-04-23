CREATE TYPE "ComicPromptRunStatus" AS ENUM ('DRAFT', 'READY', 'FAILED', 'APPROVED');

CREATE TABLE "ComicProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "storyOutline" TEXT NOT NULL,
    "worldRules" TEXT NOT NULL,
    "visualStyleGuide" TEXT NOT NULL,
    "workflowNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicCharacter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "speechGuide" TEXT NOT NULL,
    "referenceFolder" TEXT NOT NULL,
    "referenceNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicScene" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "visualNotes" TEXT NOT NULL,
    "moodNotes" TEXT NOT NULL,
    "referenceFolder" TEXT NOT NULL,
    "referenceNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicScene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicSeason" (
    "id" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outline" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicSeason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicChapter" (
    "id" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outline" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicEpisode" (
    "id" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outline" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "panelPlan" TEXT NOT NULL,
    "promptPack" TEXT NOT NULL,
    "requiredReferences" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "chapterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicEpisode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicEpisodeAsset" (
    "id" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'PAGE',
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "episodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicEpisodeAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComicPromptRun" (
    "id" TEXT NOT NULL,
    "promptType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imageModel" TEXT,
    "status" "ComicPromptRunStatus" NOT NULL DEFAULT 'DRAFT',
    "inputContext" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "promptPack" TEXT,
    "referenceChecklist" TEXT,
    "errorMessage" TEXT,
    "episodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicPromptRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComicProject_slug_key" ON "ComicProject"("slug");
CREATE UNIQUE INDEX "ComicCharacter_slug_key" ON "ComicCharacter"("slug");
CREATE UNIQUE INDEX "ComicScene_slug_key" ON "ComicScene"("slug");
CREATE UNIQUE INDEX "ComicSeason_projectId_seasonNumber_key" ON "ComicSeason"("projectId", "seasonNumber");
CREATE UNIQUE INDEX "ComicSeason_projectId_slug_key" ON "ComicSeason"("projectId", "slug");
CREATE UNIQUE INDEX "ComicChapter_seasonId_chapterNumber_key" ON "ComicChapter"("seasonId", "chapterNumber");
CREATE UNIQUE INDEX "ComicChapter_seasonId_slug_key" ON "ComicChapter"("seasonId", "slug");
CREATE UNIQUE INDEX "ComicEpisode_chapterId_episodeNumber_key" ON "ComicEpisode"("chapterId", "episodeNumber");
CREATE UNIQUE INDEX "ComicEpisode_chapterId_slug_key" ON "ComicEpisode"("chapterId", "slug");

CREATE INDEX "ComicCharacter_projectId_sortOrder_createdAt_idx" ON "ComicCharacter"("projectId", "sortOrder", "createdAt");
CREATE INDEX "ComicCharacter_active_sortOrder_idx" ON "ComicCharacter"("active", "sortOrder");
CREATE INDEX "ComicScene_projectId_sortOrder_createdAt_idx" ON "ComicScene"("projectId", "sortOrder", "createdAt");
CREATE INDEX "ComicScene_active_sortOrder_idx" ON "ComicScene"("active", "sortOrder");
CREATE INDEX "ComicSeason_published_sortOrder_createdAt_idx" ON "ComicSeason"("published", "sortOrder", "createdAt");
CREATE INDEX "ComicChapter_published_sortOrder_createdAt_idx" ON "ComicChapter"("published", "sortOrder", "createdAt");
CREATE INDEX "ComicEpisode_published_publishedAt_sortOrder_createdAt_idx" ON "ComicEpisode"("published", "publishedAt", "sortOrder", "createdAt");
CREATE INDEX "ComicEpisodeAsset_episodeId_published_sortOrder_createdAt_idx" ON "ComicEpisodeAsset"("episodeId", "published", "sortOrder", "createdAt");
CREATE INDEX "ComicPromptRun_episodeId_createdAt_idx" ON "ComicPromptRun"("episodeId", "createdAt");
CREATE INDEX "ComicPromptRun_status_createdAt_idx" ON "ComicPromptRun"("status", "createdAt");

ALTER TABLE "ComicCharacter" ADD CONSTRAINT "ComicCharacter_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ComicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComicScene" ADD CONSTRAINT "ComicScene_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ComicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComicSeason" ADD CONSTRAINT "ComicSeason_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ComicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComicChapter" ADD CONSTRAINT "ComicChapter_seasonId_fkey"
FOREIGN KEY ("seasonId") REFERENCES "ComicSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComicEpisode" ADD CONSTRAINT "ComicEpisode_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "ComicChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComicEpisodeAsset" ADD CONSTRAINT "ComicEpisodeAsset_episodeId_fkey"
FOREIGN KEY ("episodeId") REFERENCES "ComicEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComicPromptRun" ADD CONSTRAINT "ComicPromptRun_episodeId_fkey"
FOREIGN KEY ("episodeId") REFERENCES "ComicEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
