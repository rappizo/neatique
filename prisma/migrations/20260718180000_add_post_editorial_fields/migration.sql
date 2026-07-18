ALTER TABLE "Post"
ADD COLUMN "authorName" TEXT,
ADD COLUMN "authorType" TEXT,
ADD COLUMN "authorUrl" TEXT,
ADD COLUMN "reviewerName" TEXT,
ADD COLUMN "reviewerUrl" TEXT,
ADD COLUMN "editorialReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

UPDATE "StoreSetting"
SET "value" = 'false'
WHERE "key" = 'ai_post_auto_publish';

UPDATE "Post"
SET "published" = false
WHERE "slug" IN (
  'pdrn-serum-lightweight-repair-serum-routine',
  'snail-mucin-routine-for-dry-skin'
);

UPDATE "Post"
SET "seoDescription" = 'Learn how to choose a comfortable body cream for dry skin, when to apply it, and what to look for when caring for rough-feeling body areas.'
WHERE "slug" = 'body-cream-for-dry-skin';

UPDATE "Post"
SET "seoDescription" = 'Learn how to use an NAD+ peptide serum in a simple morning and evening routine and how to layer a lightweight hydrating serum.'
WHERE "slug" = 'how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine';

UPDATE "Post"
SET "coverImageAlt" = CASE "slug"
  WHEN 'what-is-pdrn-skincare' THEN 'PDRN skincare guide cover image'
  WHEN 'snail-mucin-routine-for-dry-skin' THEN 'Snail mucin skincare routine guide cover image'
  WHEN 'serum-vs-cream-routine-order' THEN 'Serum bottle and cream jar illustrating skincare layering order'
  ELSE "coverImageAlt"
END
WHERE "slug" IN (
  'what-is-pdrn-skincare',
  'snail-mucin-routine-for-dry-skin',
  'serum-vs-cream-routine-order'
);
