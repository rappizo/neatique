CREATE TABLE "ReviewPersona" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "ageRange" TEXT NOT NULL,
    "ethnicity" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "incomeLevel" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "bodyType" TEXT NOT NULL,
    "skinType" TEXT NOT NULL,
    "skinConcern" TEXT NOT NULL,
    "lifestyle" TEXT NOT NULL,
    "shoppingMotivation" TEXT NOT NULL,
    "priceSensitivity" TEXT NOT NULL,
    "productPreference" TEXT NOT NULL,
    "writingStyle" TEXT NOT NULL,
    "reviewTone" TEXT NOT NULL,
    "routineLevel" TEXT NOT NULL,
    "socialChannel" TEXT NOT NULL,
    "lifeStage" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "lifeImagePrompt" TEXT,
    "lifeImageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewPersona_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductReview" ADD COLUMN "personaId" TEXT;

CREATE UNIQUE INDEX "ReviewPersona_slug_key" ON "ReviewPersona"("slug");
CREATE INDEX "ReviewPersona_active_sortOrder_createdAt_idx" ON "ReviewPersona"("active", "sortOrder", "createdAt");
CREATE INDEX "ReviewPersona_ageRange_idx" ON "ReviewPersona"("ageRange");
CREATE INDEX "ReviewPersona_incomeLevel_idx" ON "ReviewPersona"("incomeLevel");
CREATE INDEX "ReviewPersona_ethnicity_idx" ON "ReviewPersona"("ethnicity");
CREATE INDEX "ProductReview_personaId_reviewDate_idx" ON "ProductReview"("personaId", "reviewDate");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_personaId_fkey"
FOREIGN KEY ("personaId") REFERENCES "ReviewPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
