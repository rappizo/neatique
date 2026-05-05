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
      "compact broad centered teardrop, squat body, round lower half, soft curved sides, open friendly smile, large dot eyes, upper-left glossy highlights, soft protagonist energy; never Nia's tall narrow sharp vertical spike or angled brow"
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
          "- Muci/Nia high-risk head-shape guardrail: Muci may keep his soft centered model-sheet point, but he must not receive Nia's tall narrow sharp vertical spike, Nia's controlled narrow body, or Nia's angled brow.",
          "- In any panel where Muci and Nia appear together, draw Muci first as short, broad, squat, round-based, open-smiling, and soft-sided; draw Nia separately as taller, narrower, sharper, and marked by one angled left brow.",
          "- Before final rendering, compare the two silhouettes: if Muci can be mistaken for Nia in black-and-white, redraw Muci wider, shorter, rounder at the base, and friendlier before adding acting or background detail."
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
