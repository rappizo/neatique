-- CreateTable
CREATE TABLE "ComicImageCreation" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageData" TEXT,
    "imageMimeType" TEXT,
    "imageStorageKey" TEXT,
    "imageByteSize" INTEGER,
    "imageSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicImageCreation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComicImageCreation_createdAt_idx" ON "ComicImageCreation"("createdAt");
