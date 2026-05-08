-- Add extra-story placement metadata to the existing comic episode production flow.
ALTER TABLE "ComicEpisode"
ADD COLUMN "storyType" TEXT NOT NULL DEFAULT 'MAIN',
ADD COLUMN "extraStoryParentEpisodeId" TEXT,
ADD COLUMN "extraStoryPlacementOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ComicEpisode"
ADD CONSTRAINT "ComicEpisode_extraStoryParentEpisodeId_fkey"
FOREIGN KEY ("extraStoryParentEpisodeId")
REFERENCES "ComicEpisode"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "ComicEpisode_storyType_published_publishedAt_idx"
ON "ComicEpisode"("storyType", "published", "publishedAt");

CREATE INDEX "ComicEpisode_extraStoryParentEpisodeId_extraStoryPlacementOrder_createdAt_idx"
ON "ComicEpisode"("extraStoryParentEpisodeId", "extraStoryPlacementOrder", "createdAt");

-- Store short comic-safe product visual locks sourced from active storefront products.
CREATE TABLE "ComicProductLock" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "shortCode" TEXT NOT NULL,
  "visualNotes" TEXT NOT NULL,
  "usageNotes" TEXT NOT NULL,
  "referenceNotes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ComicProductLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComicProductLock_productId_key"
ON "ComicProductLock"("productId");

CREATE UNIQUE INDEX "ComicProductLock_slug_key"
ON "ComicProductLock"("slug");

CREATE INDEX "ComicProductLock_active_sortOrder_createdAt_idx"
ON "ComicProductLock"("active", "sortOrder", "createdAt");

ALTER TABLE "ComicProductLock"
ADD CONSTRAINT "ComicProductLock_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
