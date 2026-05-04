ALTER TABLE "ComicImageCreation" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceCreationId" TEXT;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageUrl" TEXT;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageData" TEXT;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageMimeType" TEXT;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageStorageKey" TEXT;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageByteSize" INTEGER;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageSha256" TEXT;
ALTER TABLE "ComicImageCreation" ADD COLUMN "referenceImageName" TEXT;

CREATE INDEX "ComicImageCreation_referenceCreationId_idx" ON "ComicImageCreation"("referenceCreationId");
