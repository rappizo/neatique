ALTER TABLE "ComicProductLock"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageData" TEXT,
ADD COLUMN "imageMimeType" TEXT,
ADD COLUMN "imageStorageKey" TEXT,
ADD COLUMN "imageByteSize" INTEGER,
ADD COLUMN "imageSha256" TEXT,
ADD COLUMN "imagePrompt" TEXT,
ADD COLUMN "imageGeneratedAt" TIMESTAMP(3);
