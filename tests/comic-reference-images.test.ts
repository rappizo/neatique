import assert from "node:assert/strict";
import test from "node:test";
import { resolveComicPageReferenceImages } from "../lib/comic-reference-images";
import {
  COMIC_CHARACTER_HEIGHT_CHART_REFERENCE,
  SIMILAR_TEARDROP_COMPARISON_REFERENCE
} from "../lib/comic-similar-character-locks";

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

test("comic reference resolver attaches height chart when height-locked characters share a page", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText: "Muci, Artrans, Padaruna, and Nia stand together in one hallway panel.",
    requiredUploads: [
      characterUpload("muci", "Muci Model Sheet"),
      characterUpload("artrans", "Artrans Model Sheet"),
      characterUpload("padaruna", "Padaruna Model Sheet"),
      characterUpload("nia", "Nia Model Sheet")
    ]
  });

  assert.ok(
    references.some(
      (reference) =>
        reference.bucket === "CAST_COMPARISON" &&
        reference.relativePath === COMIC_CHARACTER_HEIGHT_CHART_REFERENCE.relativePath
    ),
    "Expected character height chart reference to be attached."
  );
});

test("comic reference resolver preserves comparison charts when reference limit is tight", async () => {
  const previousLimit = process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
  process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = "4";

  try {
    const references = await resolveComicPageReferenceImages({
      seasonSlug: "season-01",
      chapterSlug: "chapter-01-orientation-week-is-a-scam",
      promptText: "Muci, Nia, Snacri, Padaruna, and Padarana stand together.",
      requiredUploads: [
        characterUpload("muci", "Muci Model Sheet"),
        characterUpload("nia", "Nia Model Sheet"),
        characterUpload("snacri", "Snacri Model Sheet"),
        characterUpload("padaruna", "Padaruna Model Sheet"),
        characterUpload("padarana", "Padarana Model Sheet")
      ]
    });

    assert.equal(references.length, 4);
    assert.ok(
      references.some(
        (reference) => reference.relativePath === SIMILAR_TEARDROP_COMPARISON_REFERENCE.relativePath
      ),
      "Expected similar teardrop comparison to be preserved."
    );
    assert.ok(
      references.some(
        (reference) => reference.relativePath === COMIC_CHARACTER_HEIGHT_CHART_REFERENCE.relativePath
      ),
      "Expected height comparison chart to be preserved."
    );
  } finally {
    if (previousLimit === undefined) {
      delete process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
    } else {
      process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = previousLimit;
    }
  }
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
