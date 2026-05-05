import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

export const SIMILAR_TEARDROP_CHARACTER_SLUGS = [
  "muci",
  "nia",
  "snacri",
  "padaruna",
  "padarana"
] as const;

export const SIMILAR_TEARDROP_COMPARISON_REFERENCE: ComicChapterSceneReferenceRecord = {
  label: "Similar Teardrop Character Comparison",
  fileName: "similar-character-comparison.jpg",
  relativePath: "comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
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
      "exact Muci model-sheet droplet: broad squat pure-white body, round heavy lower half, soft bulging sides, curved rounded base, rounded hooked top tip offset toward reader-left/Muci's right, two attached small rounded feet, large black dot eyes with catchlights, small friendly U-smile, oval-plus-dot highlight on upper reader-left, no brow by default; never Nia's tall narrow vertical point or angled brow"
  },
  nia: {
    name: "Nia",
    identity:
      "taller and sharper pointed teardrop, controlled narrow body tension, sharpest vertical point, one angled brow above the left eye, confident composed smile, analytical expression; never Muci's broad squat soft protagonist face"
  },
  snacri: {
    name: "Snacri",
    identity:
      "fatter quiet droplet with the top leaning left, understated asymmetry, minimal dot eyes, tiny restrained smile, low-drama observer expression"
  },
  padaruna: {
    name: "Padaruna",
    identity:
      "sharp pointed head with a noticeably rounder fuller body, open lively dot eyes, eager smile, most socially expressive and energetic droplet"
  },
  padarana: {
    name: "Padarana",
    identity:
      "sharp pointed head with a slimmer softer body than Padaruna, closed smiling eyes, calm reassuring mouth, gentle emotional-anchor expression"
  }
};

export function getSimilarTeardropCharacterSlugs(slugs: string[]) {
  const slugSet = new Set(slugs);

  return SIMILAR_TEARDROP_CHARACTER_SLUGS.filter((slug) => slugSet.has(slug));
}

export function shouldUseSimilarTeardropComparison(slugs: string[]) {
  return getSimilarTeardropCharacterSlugs(slugs).length >= 2;
}

export function buildSimilarTeardropSeparationLock(slugs: string[]) {
  const similarSlugs = getSimilarTeardropCharacterSlugs(slugs);

  if (similarSlugs.length < 2) {
    return "";
  }

  const hasMuciAndNia = similarSlugs.includes("muci") && similarSlugs.includes("nia");

  return [
    "Similar teardrop cast separation lock:",
    "- The attached Similar Teardrop Character Comparison reference is a binding difference map for this page.",
    "- Do not average these white droplet mascots into one generic body. Match each named character to their own model sheet and comparison slot.",
    hasMuciAndNia
      ? [
          "- Muci/Nia high-risk model-sheet guardrail: draw Muci from the Muci Model Sheet Exact Lock, not from generic teardrop memory. Muci's top is a rounded hooked tip offset toward reader-left/Muci's right; it is not centered, vertical, sharp, needle-like, or Nia-like.",
          "- In any panel where Muci and Nia appear together, draw Muci first as short, broad, squat, round-lower-half, open-smiling, browless, soft-sided, and hooked toward reader-left at the top; draw Nia separately as taller, narrower, sharper, vertically pointed, and marked by one angled left brow.",
          "- Before final rendering, compare the two silhouettes: if Muci can be mistaken for Nia in black-and-white, redraw Muci wider, shorter, rounder at the base, friendlier, browless, and more model-sheet-accurate before adding acting or background detail."
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
