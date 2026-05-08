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
      "exact Muci model-sheet droplet: broad squat pure-white body, round heavy lower half, soft bulging sides, curved rounded base, natural rounded top point with only a subtle near-center lean toward reader-left/Muci's right, two attached small rounded feet, large black dot eyes with catchlights, small friendly U-smile, oval-plus-dot highlight on upper reader-left, no brow by default; shorter height tier than Padaruna while preserving the existing Muci/Padaruna ratio; never Nia's tall narrow vertical point, angled brow, or an exaggerated hooked/curling top"
  },
  nia: {
    name: "Nia",
    identity:
      "taller and sharper pointed teardrop, controlled narrow body tension, sharpest vertical point, one angled brow above the left eye, confident composed smile, analytical expression; about 1.1x Padaruna's height on the same ground plane; never Muci's broad squat soft protagonist face"
  },
  snacri: {
    name: "Snacri",
    identity:
      "fatter quiet droplet with the top leaning left, understated asymmetry, fully open round black dot eyes with tiny highlights, tiny restrained smile, low-drama observer expression; never half-lidded eyes, sleepy droopy eyes, eyelids, narrowed side-eye, angled angry eyes, brows, or tired/unimpressed expression lines; same height tier as Padaruna and Padarana; exactly two small connected feet in full-body views, never three feet or extra leg nubs"
  },
  padaruna: {
    name: "Padaruna",
    identity:
      "upright sharp pointed head with a noticeably rounder fuller buoyant body, no eyebrows or brow marks, open lively dot eyes, eager smile, most socially expressive and energetic droplet; standard height tier shared with Padarana and Snacri; about 1.1x Muci's overall size when she appears with Muci; not Muci's squat soft protagonist droplet and never Snacri's left-leaning quiet head/top"
  },
  padarana: {
    name: "Padarana",
    identity:
      "upright soft sharp pointed head with a slimmer softer body than Padaruna, closed smiling eyes, calm reassuring mouth, gentle emotional-anchor expression; same height tier as Padaruna and Snacri; never Snacri's left-leaning quiet head/top"
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
    "- Use the front-view model crops privately to size same-panel characters. Put characters on the same implied floor plane before sizing them, but keep the scene acting natural.",
    "- Measure apparent body height from the bottom of the connected feet to the top/apex of the body; ignore motion lines, props, perspective, and speech balloons.",
    "- Locked height tiers: Muci and Artrans share the shorter tier, preserving the current Muci/Padaruna ratio; Padaruna, Padarana, and Snacri share the standard Padaruna tier; Nia is only slightly taller at about 1.1x Padaruna.",
    "- Do not randomly swap heights between pages or panels, and do not stretch bodies vertically to satisfy height. Keep every droplet round, cute, and model-sheet proportioned.",
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
  const hasSnacriAndPadarunaOrPadarana =
    similarSlugs.includes("snacri") &&
    (similarSlugs.includes("padaruna") || similarSlugs.includes("padarana"));

  return [
    "Similar teardrop cast separation lock:",
    "- The attached Similar Teardrop Character Comparison reference is a binding difference map for this page.",
    "- Do not average these white droplet mascots into one generic body. Match each named character to their own model sheet and comparison slot.",
    hasMuciAndNia
      ? [
          "- Muci/Nia high-risk model-sheet guardrail: draw Muci from the Muci Model Sheet Exact Lock, not from generic teardrop memory. Muci's top is a rounded teardrop point with only a subtle near-center lean toward reader-left/Muci's right; it is not a sharp Nia point, exaggerated hook, sideways curl, or flopped-over cap.",
          "- In any panel where Muci and Nia appear together, draw Muci first as short, broad, squat, round-lower-half, open-smiling, browless, soft-sided, and only gently asymmetric at the top; draw Nia separately as taller, narrower, sharper, vertically pointed, and marked by one angled left brow.",
          "- Before final rendering, compare the two silhouettes: if Muci can be mistaken for Nia or if Muci's top leans farther than the model sheet, redraw Muci wider, shorter, rounder at the base, friendlier, browless, and closer to the model sheet before adding acting or background detail."
        ].join("\n")
      : null,
    hasMuciAndPadaruna
      ? [
          "- Muci/Padaruna high-risk size separation: when Muci and Padaruna appear together, Padaruna must read about 1.1x Muci's overall body scale and visual mass, while Muci remains the slightly smaller short broad squat protagonist droplet.",
          "- Draw Muci first as compact, broad, squat, soft-sided, browless, and friendly; draw Padaruna beside him as visibly larger, sharper-headed, rounder-bodied, browless, open-eyed, eager, and high-energy.",
          "- Before final rendering, compare their silhouettes: if Padaruna and Muci are the same size or can be mistaken for each other, make Padaruna roughly 1.1x Muci and restore her sharper head plus fuller round buoyant body."
        ].join("\n")
      : null,
    hasSnacriAndPadarunaOrPadarana
      ? [
          "- Padaruna/Padarana anti-Snacri head lock: Snacri is the only droplet in this group with a left-leaning quiet top/head silhouette. Never copy that left-leaning Snacri head onto Padaruna or Padarana.",
          "- Padaruna must keep an upright sharp pointed head above a fuller round buoyant body, open lively eyes, no eyebrows, and an eager smile.",
          "- Padarana must keep an upright soft pointed head above a slimmer gentle body with closed smiling eyes.",
          "- Before final line art, compare the three top silhouettes: if Padaruna or Padarana has Snacri's left-leaning head/top, redraw that character with their own upright pointed model-sheet head."
        ].join("\n")
      : null,
    ...similarSlugs.map((slug) => {
      const lock = SIMILAR_TEARDROP_CHARACTER_LOCKS[slug];
      return `- ${lock.name}: ${lock.identity}.`;
    }),
    "- In every group panel, silhouette readability comes before decorative acting: each character must be identifiable in black-and-white by outline, face detail, body width, head direction, and default expression."
  ]
    .filter(Boolean)
    .join("\n");
}
