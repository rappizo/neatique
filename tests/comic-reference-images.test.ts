import assert from "node:assert/strict";
import test from "node:test";
import { resolveComicPageReferenceImages } from "../lib/comic-reference-images";
import { SIMILAR_TEARDROP_COMPARISON_REFERENCE } from "../lib/comic-similar-character-locks";

function characterUpload(slug: string, label: string) {
  return {
    bucket: "CHARACTER" as const,
    label,
    slug,
    whyThisMatters: `${label} appears on this page.`,
    contentSummary: `${label} exact model sheet.`,
    uploadImageNames: ["model-sheet.jpg"],
    relativePaths: [`comic/characters/${slug}/refs/model-sheet.jpg`]
  };
}

test("comic reference resolver attaches similar teardrop comparison when similar characters share a page", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText: "Muci, Nia, and Snacri appear together in one group panel.",
    requiredUploads: [
      characterUpload("muci", "Muci Model Sheet"),
      characterUpload("nia", "Nia Model Sheet"),
      characterUpload("snacri", "Snacri Model Sheet")
    ]
  });

  assert.ok(
    references.some(
      (reference) =>
        reference.bucket === "CAST_COMPARISON" &&
        reference.relativePath === SIMILAR_TEARDROP_COMPARISON_REFERENCE.relativePath
    ),
    "Expected similar teardrop comparison reference to be attached."
  );
});

test("comic reference resolver does not attach comparison for one similar character alone", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText: "Muci appears alone in this panel.",
    requiredUploads: [characterUpload("muci", "Muci Model Sheet")]
  });

  assert.equal(
    references.some((reference) => reference.bucket === "CAST_COMPARISON"),
    false
  );
});
