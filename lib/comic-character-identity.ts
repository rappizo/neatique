import { prisma } from "@/lib/db";
import { getComicCharacterReferenceFiles } from "@/lib/comic-reference-manifest";

export type ComicCharacterIdentityLock = {
  slug: string;
  name: string;
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceNotes: string | null;
  profileMarkdown: string | null;
  referenceFiles: Array<{
    label: string;
    fileName: string;
    relativePath: string;
    extension: string;
  }>;
};

function normalizeSlugs(slugs: string[]) {
  return Array.from(
    new Set(
      slugs
        .map((slug) => slug.trim())
        .filter(Boolean)
    )
  );
}

function buildCharacterProfileMarkdown(character: {
  name: string;
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceNotes: string | null;
}) {
  return [
    `# ${character.name}`,
    "",
    "## Role",
    character.role,
    "",
    "## Appearance lock",
    character.appearance,
    "",
    "## Personality lock",
    character.personality,
    "",
    "## Voice guide",
    character.speechGuide,
    "",
    "## Non-negotiable visual references",
    character.referenceNotes || "Use the listed character reference images as exact identity locks."
  ].join("\n");
}

export async function loadComicCharacterIdentityLocks(slugs: string[]) {
  const normalizedSlugs = normalizeSlugs(slugs);

  if (normalizedSlugs.length === 0) {
    return [];
  }

  const characters = await prisma.comicCharacter.findMany({
    where: {
      slug: {
        in: normalizedSlugs
      }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  const characterBySlug = new Map(characters.map((character) => [character.slug, character]));
  const locks = await Promise.all(
    normalizedSlugs.map(async (slug) => {
      const character = characterBySlug.get(slug);

      if (!character) {
        return null;
      }

      return {
        slug: character.slug,
        name: character.name,
        role: character.role,
        appearance: character.appearance,
        personality: character.personality,
        speechGuide: character.speechGuide,
        referenceNotes: character.referenceNotes,
        profileMarkdown: buildCharacterProfileMarkdown(character),
        referenceFiles: getComicCharacterReferenceFiles(character.slug)
      };
    })
  );

  return locks.filter(Boolean) as ComicCharacterIdentityLock[];
}
