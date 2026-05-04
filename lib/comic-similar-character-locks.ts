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
      "compact broad centered teardrop, squat body, round lower half, open friendly smile, large dot eyes, upper-left glossy highlights, soft protagonist energy"
  },
  nia: {
    name: "Nia",
    identity:
      "taller and sharper pointed teardrop, controlled narrow body tension, one angled brow above the left eye, confident composed smile, analytical expression"
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

  return [
    "Similar teardrop cast separation lock:",
    "- The attached Similar Teardrop Character Comparison reference is a binding difference map for this page.",
    "- Do not average these white droplet mascots into one generic body. Match each named character to their own model sheet and comparison slot.",
    ...similarSlugs.map((slug) => {
      const lock = SIMILAR_TEARDROP_CHARACTER_LOCKS[slug];
      return `- ${lock.name}: ${lock.identity}.`;
    }),
    "- In every group panel, silhouette readability comes before decorative acting: each character must be identifiable in black-and-white by outline, face detail, body width, head direction, and default expression."
  ].join("\n");
}
