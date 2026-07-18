ALTER TABLE "Product"
ADD COLUMN "keyIngredientDetails" TEXT,
ADD COLUMN "pdrnSource" TEXT,
ADD COLUMN "suitableFor" TEXT,
ADD COLUMN "cautionFor" TEXT,
ADD COLUMN "batchExpiryInfo" TEXT,
ADD COLUMN "textureVideoUrl" TEXT;

-- Neatique is the manufacturer and has confirmed that its SKU is also the official MPN.
UPDATE "Product"
SET
  "mpn" = "productCode",
  "identifierExists" = TRUE,
  "countryOfOrigin" = 'CN',
  "batchExpiryInfo" = COALESCE(
    "batchExpiryInfo",
    'Refer to the lot or batch code and expiration or period-after-opening information printed on the product packaging.'
  )
WHERE "productCode" IS NOT NULL;

UPDATE "Product"
SET "keyIngredientDetails" = CASE "slug"
  WHEN 'pdrn-cream' THEN 'Salmon-derived PDRN; concentration not provided'
  WHEN 'pdrn-serum' THEN 'Salmon-derived PDRN; 5-peptide blend; individual concentrations not provided'
  WHEN 'snail-mucin-cream' THEN 'Snail mucin; concentration not provided'
  WHEN 'snail-mucin-serum' THEN '96% snail mucin'
  WHEN 'at13-arbutin-tranexamic-cream' THEN '8% arbutin; 5% tranexamic acid'
  WHEN 'tnv3-tranexamic-nicotinamide-serum' THEN '10% tranexamic acid; 2% nicotinamide; vitamin C concentration not provided'
  WHEN 'nt16-niacinamide-tranexamic-serum' THEN '11% niacinamide; 5% tranexamic acid'
  WHEN 'nad-collagen-peptide-serum' THEN 'NAD+; collagen peptides; niacinamide; hyaluronic acid; individual concentrations not provided'
  WHEN 'bee-venom-body-cream' THEN 'Bee venom; hyaluronic acid; individual concentrations not provided'
  WHEN 'kit9-niacinamide-turmeric-kojic-acid-serum' THEN '6% niacinamide; 1.5% turmeric; 1.5% kojic acid'
  WHEN 'pdrn-cleanser' THEN 'PDRN Pink 99%; niacinamide concentration not provided'
  WHEN 'nad-face-cream' THEN 'NAD+; niacinamide; alpha-arbutin; hyaluronic acid; ceramide; adenosine; individual concentrations not provided'
  ELSE "keyIngredientDetails"
END
WHERE "status" = 'ACTIVE';

UPDATE "Product"
SET "pdrnSource" = 'Salmon-derived PDRN'
WHERE "slug" IN ('pdrn-cream', 'pdrn-serum');

UPDATE "Product"
SET "suitableFor" = CASE "slug"
  WHEN 'pdrn-cream' THEN 'Dry, dehydrated or stressed-feeling skin seeking a cushioning moisturizer step.'
  WHEN 'pdrn-serum' THEN 'Normal, combination or dehydrated-feeling skin seeking a lightweight serum layer.'
  WHEN 'snail-mucin-cream' THEN 'Dry or sensitized-feeling skin seeking a dewy moisturizer step.'
  WHEN 'snail-mucin-serum' THEN 'Dehydrated or easily stressed-feeling skin seeking lightweight hydration.'
  WHEN 'at13-arbutin-tranexamic-cream' THEN 'Routines focused on a brighter, more even-looking tone with a cream texture.'
  WHEN 'tnv3-tranexamic-nicotinamide-serum' THEN 'Routines focused on uneven-looking tone and the appearance of post-blemish marks.'
  WHEN 'nt16-niacinamide-tranexamic-serum' THEN 'Routines focused on uneven-looking tone, texture and the appearance of post-blemish marks.'
  WHEN 'nad-collagen-peptide-serum' THEN 'Routines seeking lightweight hydration and smoother, firmer-looking skin.'
  WHEN 'bee-venom-body-cream' THEN 'Dry or rough-feeling body areas including arms, legs, neck and shoulders.'
  WHEN 'kit9-niacinamide-turmeric-kojic-acid-serum' THEN 'Routines focused on refined-looking texture and a more even-looking tone.'
  WHEN 'pdrn-cleanser' THEN 'Daily face-cleansing routines seeking a creamy rinse-off first step.'
  WHEN 'nad-face-cream' THEN 'Face, neck and targeted dry areas seeking a richer moisturizer step.'
  ELSE "suitableFor"
END
WHERE "status" = 'ACTIVE';

UPDATE "Product"
SET "directions" = CASE "slug"
  WHEN 'pdrn-cleanser' THEN 'Massage over damp facial skin as the first routine step, then rinse thoroughly. Use morning and/or evening according to skin comfort.'
  WHEN 'bee-venom-body-cream' THEN 'Apply to clean body skin, especially dry or rough-feeling areas. Use after showering, before bed or whenever skin feels dry.'
  WHEN 'pdrn-cream' THEN 'Apply after serum as the moisturizer step. Use morning and/or evening; finish daytime facial routines with sunscreen.'
  WHEN 'snail-mucin-cream' THEN 'Apply after serum as the moisturizer step. Use morning and/or evening; finish daytime facial routines with sunscreen.'
  WHEN 'at13-arbutin-tranexamic-cream' THEN 'Apply after serum as the moisturizer step, morning or evening. Finish daytime facial routines with sunscreen.'
  WHEN 'nad-face-cream' THEN 'Apply as the moisturizer step to face, neck or targeted dry areas, morning and/or evening. Finish daytime facial routines with sunscreen.'
  ELSE 'Apply after cleansing and before moisturizer. Use morning and/or evening according to skin comfort, and finish daytime facial routines with sunscreen.'
END
WHERE "status" = 'ACTIVE' AND "directions" IS NULL;
