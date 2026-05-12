import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

export const SIMILAR_TEARDROP_CHARACTER_SLUGS = [
  "muci",
  "nia",
  "snacri",
  "padaruna",
  "padarana"
] as const;

export const COMIC_CHARACTER_HEIGHT_CHART_SLUGS = [
  "muci",
  "artrans",
  "padaruna",
  "padarana",
  "snacri",
  "nia"
] as const;

export const SIMILAR_TEARDROP_COMPARISON_REFERENCE: ComicChapterSceneReferenceRecord = {
  label: "Similar Teardrop Character Comparison",
  fileName: "similar-character-comparison.jpg",
  relativePath: "comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
  extension: "jpg"
};

export const ACTIVE_TEARDROP_COMPARISON_REFERENCE: ComicChapterSceneReferenceRecord = {
  label: "Active Teardrop Character Comparison",
  fileName: "active-teardrop-character-comparison.jpg",
  relativePath:
    "comic/scenes/similar-character-comparison-active-cast/refs/active-teardrop-character-comparison.jpg",
  extension: "jpg"
};

export const COMIC_CHARACTER_HEIGHT_CHART_REFERENCE: ComicChapterSceneReferenceRecord = {
  label: "Front-View Character Height Reference",
  fileName: "character-height-comparison.jpg",
  relativePath: "comic/scenes/character-height-comparison/refs/character-height-comparison.jpg",
  extension: "jpg"
};

export const ACTIVE_CHARACTER_HEIGHT_CHART_REFERENCE: ComicChapterSceneReferenceRecord = {
  label: "Active Character Height Reference",
  fileName: "active-character-height-comparison.jpg",
  relativePath:
    "comic/scenes/character-height-comparison-active-cast/refs/active-character-height-comparison.jpg",
  extension: "jpg"
};

export const SIMILAR_TEARDROP_CHARACTER_LOCKS: Record<
  (typeof SIMILAR_TEARDROP_CHARACTER_SLUGS)[number],
  {
    name: string;
    identity: string;
  }
> = {
  muci: {
    name: "Muci",
    identity:
      "Muci model-sheet match: broad squat rounded droplet, round heavy lower half, reader-left/page-left top lean, no brow, friendly U-smile, two attached feet"
  },
  nia: {
    name: "Nia",
    identity:
      "Nia model-sheet match: taller narrow controlled teardrop, sharp vertical point, one angled left brow, controlled smile, two attached feet"
  },
  snacri: {
    name: "Snacri",
    identity:
      "Snacri model-sheet match: quiet fuller droplet, reader-right/page-right top lean, fully open round dot eyes, tiny smile, two attached feet"
  },
  padaruna: {
    name: "Padaruna",
    identity:
      "Padaruna model-sheet match: sharp upright centered point, chubby pear-bottom body, wide soft lower belly, lively open eyes, no brows, two attached feet"
  },
  padarana: {
    name: "Padarana",
    identity:
      "Padarana model-sheet match: upright soft point, slimmer gentle body, closed smiling eyes, calm mouth, two attached feet"
  }
};

export const COMIC_CHARACTER_HEIGHT_LOCKS: Record<
  (typeof COMIC_CHARACTER_HEIGHT_CHART_SLUGS)[number],
  {
    name: string;
    relativeHeight: string;
    note: string;
  }
> = {
  muci: {
    name: "Muci",
    relativeHeight: "about 0.91x Padaruna",
    note:
      "shorter broad protagonist height tier; preserve the current Muci/Padaruna scale, so Padaruna stays about 1.1x Muci"
  },
  artrans: {
    name: "Artrans",
    relativeHeight: "same as Muci",
    note: "same shorter height tier as Muci"
  },
  padaruna: {
    name: "Padaruna",
    relativeHeight: "1.00x Padaruna baseline",
    note: "standard height tier"
  },
  padarana: {
    name: "Padarana",
    relativeHeight: "same as Padaruna",
    note: "standard height tier, matching Padaruna"
  },
  snacri: {
    name: "Snacri",
    relativeHeight: "same as Padaruna",
    note: "standard height tier, matching Padaruna"
  },
  nia: {
    name: "Nia",
    relativeHeight: "about 1.10x Padaruna",
    note: "only slightly taller than the Padaruna tier, not giant or stretched"
  }
};

export function getSimilarTeardropCharacterSlugs(slugs: string[]) {
  const slugSet = new Set(slugs);

  return SIMILAR_TEARDROP_CHARACTER_SLUGS.filter((slug) => slugSet.has(slug));
}

export function shouldUseSimilarTeardropComparison(slugs: string[]) {
  return getSimilarTeardropCharacterSlugs(slugs).length >= 2;
}

export function getComicCharacterHeightChartSlugs(slugs: string[]) {
  const slugSet = new Set(slugs);

  return COMIC_CHARACTER_HEIGHT_CHART_SLUGS.filter((slug) => slugSet.has(slug));
}

export function shouldUseComicCharacterHeightChart(slugs: string[]) {
  return getComicCharacterHeightChartSlugs(slugs).length >= 2;
}

export function getSimilarTeardropComparisonReference(slugs: string[]) {
  return getSimilarTeardropCharacterSlugs(slugs).includes("snacri")
    ? SIMILAR_TEARDROP_COMPARISON_REFERENCE
    : ACTIVE_TEARDROP_COMPARISON_REFERENCE;
}

export function getComicCharacterHeightChartReference(slugs: string[]) {
  return getComicCharacterHeightChartSlugs(slugs).includes("snacri")
    ? COMIC_CHARACTER_HEIGHT_CHART_REFERENCE
    : ACTIVE_CHARACTER_HEIGHT_CHART_REFERENCE;
}

function formatHeightLockNames(names: string[]) {
  if (names.length <= 1) {
    return names[0] || "";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function buildComicCharacterHeightChartLock(slugs: string[]) {
  const heightSlugs = getComicCharacterHeightChartSlugs(slugs);

  if (heightSlugs.length < 2) {
    return "";
  }

  const heightSlugSet = new Set(heightSlugs);
  const shorterTierNames = ["muci", "artrans"]
    .filter((slug) => heightSlugSet.has(slug as (typeof COMIC_CHARACTER_HEIGHT_CHART_SLUGS)[number]))
    .map((slug) => COMIC_CHARACTER_HEIGHT_LOCKS[slug as (typeof COMIC_CHARACTER_HEIGHT_CHART_SLUGS)[number]].name);
  const standardTierNames = ["padaruna", "padarana", "snacri"]
    .filter((slug) => heightSlugSet.has(slug as (typeof COMIC_CHARACTER_HEIGHT_CHART_SLUGS)[number]))
    .map((slug) => COMIC_CHARACTER_HEIGHT_LOCKS[slug as (typeof COMIC_CHARACTER_HEIGHT_CHART_SLUGS)[number]].name);
  const tierRules = [
    shorterTierNames.length > 0
      ? shorterTierNames.length === 1
        ? `${shorterTierNames[0]} is in the shorter tier`
        : `${formatHeightLockNames(shorterTierNames)} share the shorter tier`
      : null,
    standardTierNames.length > 0
      ? standardTierNames.length === 1
        ? `${standardTierNames[0]} is in the standard Padaruna tier`
        : `${formatHeightLockNames(standardTierNames)} share the standard Padaruna tier`
      : null,
    heightSlugSet.has("nia") ? "Nia is only slightly taller at about 1.1x Padaruna" : null,
    heightSlugSet.has("padaruna") && heightSlugSet.has("muci")
      ? "Padaruna keeps the existing about-1.1x-Muci relationship"
      : null
  ].filter(Boolean);

  return [
    "Character height reference lock:",
    "- Use the attached height reference only as an off-canvas production guide. Do not draw the chart, scale marks, labels, lineup, or height-comparison diagram inside the comic panel.",
    `- Locked height tiers for active characters only: ${tierRules.join("; ")}.`,
    ...heightSlugs.map((slug) => {
      const lock = COMIC_CHARACTER_HEIGHT_LOCKS[slug];
      return `- ${lock.name}: ${lock.relativeHeight}; ${lock.note}.`;
    })
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSimilarTeardropSeparationLock(slugs: string[]) {
  const similarSlugs = getSimilarTeardropCharacterSlugs(slugs);

  if (similarSlugs.length < 2) {
    return "";
  }

  return [
    "Active teardrop reference reminder:",
    "- Use the attached teardrop comparison image only as an off-canvas reference. The page itself should only show the story panels.",
    "- Match each visible character to that character's own model sheet; keep the text reminders short."
  ]
    .filter(Boolean)
    .join("\n");
}
