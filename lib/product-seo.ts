import type { ProductRecord } from "@/lib/types";

export type ProductSeoEntry = {
  title: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
};

export const PRODUCT_SEO_BY_SLUG: Record<string, ProductSeoEntry> = {
  "pdrn-cream": {
    title: "PDRN Cream for Dry, Dehydrated Skin",
    description:
      "Shop Neatique PDRN Cream, a nourishing daily moisturizer for dry, dehydrated or stressed-looking skin. Layer after serum morning or night.",
    primaryKeyword: "PDRN cream",
    secondaryKeywords: ["PDRN moisturizer", "cream for dehydrated skin", "barrier care cream"]
  },
  "pdrn-serum": {
    title: "PDRN Serum for Hydration & Glow",
    description:
      "Shop Neatique Salmon PDRN Serum with a 5-peptide blend for silky hydration and smoother, firmer, more radiant-looking skin without heaviness.",
    primaryKeyword: "Salmon PDRN serum",
    secondaryKeywords: ["PDRN peptide serum", "serum for dull-looking skin", "hydrating PDRN serum"]
  },
  "snail-mucin-cream": {
    title: "Snail Mucin Cream for Dry Skin",
    description:
      "Shop Neatique Snail Mucin Cream, a comforting moisturizer for dry or sensitized-feeling skin with a soft, cushiony and dewy-looking finish.",
    primaryKeyword: "snail mucin cream",
    secondaryKeywords: ["snail cream for dry skin", "dewy moisturizer", "comforting face cream"]
  },
  "snail-mucin-serum": {
    title: "96% Snail Mucin Serum for Hydration",
    description:
      "Shop Neatique 96% Snail Mucin Serum, a lightweight daily hydration serum that layers easily under moisturizer or sunscreen for soft-looking skin.",
    primaryKeyword: "96% snail mucin serum",
    secondaryKeywords: ["snail mucin essence serum", "hydrating snail serum", "serum for dehydrated skin"]
  },
  "at13-arbutin-tranexamic-cream": {
    title: "Arbutin + Tranexamic Acid Cream",
    description:
      "Shop Neatique AT13 Cream with 8% arbutin and 5% tranexamic acid, a silky daily moisturizer for a brighter, more even-looking complexion.",
    primaryKeyword: "arbutin tranexamic acid cream",
    secondaryKeywords: ["8% arbutin cream", "5% tranexamic acid cream", "cream for uneven-looking tone"]
  },
  "tnv3-tranexamic-nicotinamide-serum": {
    title: "Tranexamic Acid + Vitamin C Serum",
    description:
      "Shop Neatique TNV3 Serum with 10% tranexamic acid, 2% nicotinamide and vitamin C for uneven-looking tone and post-blemish mark care.",
    primaryKeyword: "10% tranexamic acid serum",
    secondaryKeywords: ["tranexamic acid vitamin C serum", "nicotinamide serum", "serum for post-blemish marks"]
  },
  "nt16-niacinamide-tranexamic-serum": {
    title: "Niacinamide + Tranexamic Acid Serum",
    description:
      "Shop Neatique NT16 Serum with 11% niacinamide and 5% tranexamic acid for a smoother surface, refined finish and more even-looking tone.",
    primaryKeyword: "niacinamide tranexamic acid serum",
    secondaryKeywords: ["11% niacinamide serum", "5% tranexamic acid serum", "dark spot serum"]
  },
  "nad-collagen-peptide-serum": {
    title: "NAD+ Peptide Serum for Firm-Looking Skin",
    description:
      "Shop Neatique NAD+ Collagen Peptide Serum with niacinamide and hyaluronic acid for layer-friendly hydration and smoother, firmer-looking skin.",
    primaryKeyword: "NAD+ collagen peptide serum",
    secondaryKeywords: ["NAD serum", "collagen peptide serum", "niacinamide peptide serum"]
  },
  "bee-venom-body-cream": {
    title: "Bee Venom Body Cream for Dry Skin",
    description:
      "Shop Neatique Bee Venom Body Cream with hyaluronic acid for dry, rough-feeling areas on arms, legs, neck and shoulders with a non-greasy finish.",
    primaryKeyword: "bee venom body cream",
    secondaryKeywords: ["body cream for dry skin", "hyaluronic acid body cream", "body cream for rough areas"]
  },
  "kit9-niacinamide-turmeric-kojic-acid-serum": {
    title: "Niacinamide + Kojic Acid Serum",
    description:
      "Shop Neatique KIT9+ Serum with 6% niacinamide, 1.5% turmeric and 1.5% kojic acid for refined-looking texture and a more even-looking glow.",
    primaryKeyword: "niacinamide turmeric kojic acid serum",
    secondaryKeywords: ["6% niacinamide serum", "turmeric serum", "kojic acid serum"]
  },
  "pdrn-cleanser": {
    title: "PDRN + Niacinamide Whip Cleanser",
    description:
      "Shop Neatique PDRN Pink 99% + Niacinamide Whip Cleanser, a creamy daily face wash for oil, sunscreen and makeup residue without a stripped feel.",
    primaryKeyword: "PDRN cleanser",
    secondaryKeywords: ["niacinamide cleanser", "whip face cleanser", "cleanser without tight feeling"]
  },
  "nad-face-cream": {
    title: "NAD+ Face Cream for Hydration",
    description:
      "Shop Neatique 8+ NAD+ Face Cream with niacinamide, alpha-arbutin, hyaluronic acid, ceramide and adenosine for hydrated, smoother-looking skin.",
    primaryKeyword: "NAD+ face cream",
    secondaryKeywords: ["niacinamide face cream", "NAD cream", "face and neck cream"]
  }
};

export function getProductSeo(product: Pick<
  ProductRecord,
  "slug" | "name" | "category" | "shortDescription" | "seoTitle" | "seoDescription"
>): ProductSeoEntry {
  const mapped = PRODUCT_SEO_BY_SLUG[product.slug];
  const fallback: ProductSeoEntry = {
    title: product.name,
    description: product.shortDescription,
    primaryKeyword: product.name,
    secondaryKeywords: [`${product.category} skincare`, `buy ${product.name}`]
  };
  const base = mapped ?? fallback;

  return {
    ...base,
    title: product.seoTitle?.trim() || base.title,
    description: product.seoDescription?.trim() || base.description
  };
}
