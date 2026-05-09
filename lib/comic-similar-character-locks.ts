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

export const COMIC_CHARACTER_HEIGHT_CHART_REFERENCE: ComicChapterSceneReferenceRecord = {
  label: "Front-View Character Height Reference",
  fileName: "character-height-comparison.jpg",
  relativePath: "comic/scenes/character-height-comparison/refs/character-height-comparison.jpg",
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
      "exact Muci model-sheet droplet: broad squat pure-white body, round heavy lower half, consistent reader-left/page-left top lean, two attached feet, friendly U-smile, no brow; shorter tier than Padaruna; never Nia's sharp vertical point, Snacri's right lean, or hooked/curling top"
  },
  nia: {
    name: "Nia",
    identity:
      "taller, narrower, controlled teardrop with a sharp vertical point, one angled left brow, and confident controlled smile; about 1.1x Padaruna's height, but not a stretched giant; never Padaruna's wide lower belly, chubby base mass, or eager browless open face"
  },
  snacri: {
    name: "Snacri",
    identity:
      "fatter quiet droplet with the head/top leaning right toward reader-right/page-right, fully open round black dot eyes with tiny highlights, tiny restrained smile; never sleepy/angry/browed eyes; never Muci's left lean; same height tier as Padaruna and Padarana; exactly two connected feet"
  },
  padaruna: {
    name: "Padaruna",
    identity:
      "very sharp upright centered point above a cute plump/chubby pear-bottom body: the lower half is visibly wider, rounder, heavier, and softer than the upper body, with a soft wide lower belly and buoyant base mass; no side nubs, no brows, lively open eyes; standard Padaruna tier; about 1.1x Muci's size when paired; never skinny, narrow, tall-stretched, Nia-shaped, or Snacri-headed"
  },
  padarana: {
    name: "Padarana",
    identity:
      "upright soft pointed head, slimmer gentler body than Padaruna, closed smiling eyes, calm mouth; same height tier as Padaruna and Snacri; never Snacri's right-leaning head"
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

export function buildComicCharacterHeightChartLock(slugs: string[]) {
  const heightSlugs = getComicCharacterHeightChartSlugs(slugs);

  if (heightSlugs.length < 2) {
    return "";
  }

  return [
    "Character height reference lock:",
    "- The attached Front-View Character Height Reference is an off-canvas production reference only. Do not draw the chart, scale marks, labels, lineup, or height-comparison diagram inside the comic panel.",
    "- Locked height tiers: Muci and Artrans share the shorter tier; Padaruna, Padarana, and Snacri share the standard Padaruna tier; Nia is only slightly taller at about 1.1x Padaruna; Padaruna keeps the existing about-1.1x-Muci relationship.",
    "- Put same-panel characters on the same floor plane, but do not stretch bodies vertically. Keep droplets round, cute, and model-sheet proportioned.",
    ...heightSlugs.map((slug) => {
      const lock = COMIC_CHARACTER_HEIGHT_LOCKS[slug];
      return `- ${lock.name}: ${lock.relativeHeight}; ${lock.note}.`;
    }),
    "- If the drawing makes Padarana, Snacri, or Padaruna noticeably taller/shorter than each other, or makes Nia much taller than 1.1x Padaruna, rescale before final line art."
  ].join("\n");
}

export function buildSimilarTeardropSeparationLock(slugs: string[]) {
  const similarSlugs = getSimilarTeardropCharacterSlugs(slugs);

  if (similarSlugs.length < 2) {
    return "";
  }

  const hasMuciAndNia = similarSlugs.includes("muci") && similarSlugs.includes("nia");
  const hasMuciAndPadaruna =
    similarSlugs.includes("muci") && similarSlugs.includes("padaruna");
  const hasNiaAndPadaruna =
    similarSlugs.includes("nia") && similarSlugs.includes("padaruna");
  const hasSnacriAndPadarunaOrPadarana =
    similarSlugs.includes("snacri") &&
    (similarSlugs.includes("padaruna") || similarSlugs.includes("padarana"));

  return [
    "Similar teardrop cast separation lock:",
    "- The attached Similar Teardrop Character Comparison reference is a binding difference map for this page.",
    "- Do not average these white droplet mascots into one generic body. Match each character to their own model sheet.",
    hasMuciAndNia
      ? [
          "- Muci/Nia high-risk model-sheet guardrail: draw Muci from the Muci Model Sheet Exact Lock, not from generic teardrop memory. Muci's top is a rounded teardrop point with a consistent lean toward reader-left/Muci's right; it is not a sharp Nia point, Snacri's right-leaning top, exaggerated hook, sideways curl, or flopped-over cap.",
          "- Muci stays short, broad, squat, friendly, and browless; Nia stays taller, sharper, and marked by one angled left brow."
        ].join("\n")
      : null,
    hasMuciAndPadaruna
      ? [
          "- Padaruna anti-Muci identity lock / Muci/Padaruna high-risk size separation: Padaruna reads about 1.1x Muci's overall size and visual mass while Muci remains the smaller broad squat protagonist droplet.",
          "- Padaruna uses her model sheet: very sharp upright centered pointed head, plump/chubby full rounded pear-bottom body, visibly wider soft lower belly and heavier rounded base, no side nubs or arm-like protrusions, no eyebrows or brow marks; not Muci's squat soft protagonist droplet and not skinny, narrow, tall-stretched, or delicate."
        ].join("\n")
      : null,
    hasNiaAndPadaruna
      ? [
          "- Padaruna/Nia high-risk body-shape separation: draw Nia and Padaruna as two different model-sheet silhouettes before adding acting.",
          "- Nia stays taller, narrower, more vertical, controlled, and marked by one angled left brow. Nia's body tapers cleanly and does not have Padaruna's chubby lower-heavy base.",
          "- Padaruna keeps a very sharp upright centered head, but the body under it must stay cute and lower-heavy: wide rounded lower belly, pear-bottom mass, soft broad base, and two small connected feet. Padaruna is not a tall narrow Nia-shaped droplet.",
          "- If Padaruna's sides become straight, her lower half becomes slim, or her body stretches upward like Nia, redraw Padaruna shorter-rounder in the lower half while preserving the sharp centered point."
        ].join("\n")
      : null,
    hasSnacriAndPadarunaOrPadarana
      ? [
          "- Padaruna/Padarana anti-Snacri head lock: Snacri is the only droplet here with a right-leaning quiet top/head silhouette. Never copy that right-leaning Snacri head onto Padaruna or Padarana.",
          "- Padaruna keeps her own very sharp upright centered pointed head, cute plump/chubby full rounded buoyant pear-bottom body, soft wide lower belly, heavier rounded lower half, open lively eyes, no eyebrows, no side nubs or arm-like protrusions; never Snacri's right-leaning quiet head/top.",
          "- Padarana keeps her own upright soft pointed head above a slimmer gentle body with closed smiling eyes; never Snacri's right-leaning quiet head/top.",
          "- If Padaruna looks skinny, narrow, tall-stretched, or delicate, redraw her wider and chubbier under the sharp apex."
        ].join("\n")
      : null,
    ...similarSlugs.map((slug) => {
      const lock = SIMILAR_TEARDROP_CHARACTER_LOCKS[slug];
      return `- ${lock.name}: ${lock.identity}.`;
    }),
    "- In group panels, silhouette readability comes before decorative acting."
  ]
    .filter(Boolean)
    .join("\n");
}
