import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeComicReferenceImageOverrides,
  resolveComicPageReferenceImages
} from "../lib/comic-reference-images";
import {
  ACTIVE_CHARACTER_HEIGHT_CHART_REFERENCE,
  ACTIVE_TEARDROP_COMPARISON_REFERENCE,
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

function chapterSceneUpload(slug: string, label: string, fileName: string) {
  return {
    bucket: "CHAPTER_SCENE" as const,
    label,
    slug,
    whyThisMatters: `${label} is required for this page.`,
    contentSummary: `${label} exact chapter reference.`,
    uploadImageNames: [fileName],
    relativePaths: [
      `comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/${fileName}`
    ]
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

test("comic reference resolver attaches front-view height reference when height-locked characters share a page", async () => {
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
        reference.relativePath === ACTIVE_CHARACTER_HEIGHT_CHART_REFERENCE.relativePath
    ),
    "Expected front-view character height reference to be attached."
  );
});

test("comic reference resolver avoids Snacri model and full-cast refs for note-only mentions", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText:
      "Muci, Nia, and Padarana study Snacri's warning note while Padarana keeps her upright soft point and closed smiling eyes.",
    requiredUploads: [
      characterUpload("muci", "Muci Model Sheet"),
      characterUpload("nia", "Nia Model Sheet"),
      characterUpload("padarana", "Padarana Model Sheet")
    ]
  });

  assert.equal(
    references.some(
      (reference) =>
        reference.slug === "snacri" ||
        reference.relativePath === "comic/characters/snacri/refs/model-sheet.jpg"
    ),
    false
  );
  assert.ok(
    references.some(
      (reference) => reference.relativePath === ACTIVE_TEARDROP_COMPARISON_REFERENCE.relativePath
    ),
    "Expected active teardrop comparison without the absent character."
  );
  assert.ok(
    references.some(
      (reference) => reference.relativePath === ACTIVE_CHARACTER_HEIGHT_CHART_REFERENCE.relativePath
    ),
    "Expected active height chart without the absent character."
  );
  assert.equal(
    references.some(
      (reference) => reference.relativePath === SIMILAR_TEARDROP_COMPARISON_REFERENCE.relativePath
    ),
    false
  );
  assert.equal(
    references.some(
      (reference) => reference.relativePath === COMIC_CHARACTER_HEIGHT_CHART_REFERENCE.relativePath
    ),
    false
  );
});

test("comic reference resolver preserves comparison references when reference limit is tight", async () => {
  const previousLimit = process.env.COMIC_MAX_REFERENCE_IMAGES;
  process.env.COMIC_MAX_REFERENCE_IMAGES = "4";

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
      "Expected front-view height reference to be preserved."
    );
  } finally {
    if (previousLimit === undefined) {
      delete process.env.COMIC_MAX_REFERENCE_IMAGES;
    } else {
      process.env.COMIC_MAX_REFERENCE_IMAGES = previousLimit;
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

test("comic reference resolver auto-attaches Mira by short name", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-02-the-floor-4-curfew",
    promptText:
      "Mira enters the Residence Hall sink area with a calm inspection clipboard and gentle RA authority.",
    requiredUploads: []
  });

  assert.ok(
    references.some(
      (reference) =>
        reference.slug === "mira-mistwell" &&
        reference.relativePath === "comic/characters/mira-mistwell/refs/model-sheet.jpg"
    ),
    "Expected Mira's model sheet to be attached from the short-name mention."
  );
});

test("comic reference resolver auto-attaches old student handbook prop", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText: "Muci and Snacri compare the old handbook with a new student handbook.",
    requiredUploads: []
  });

  assert.ok(
    references.some(
      (reference) =>
        reference.relativePath ===
        "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Student Handbook (old edition).jpg"
    ),
    "Expected the old student handbook reference to be attached when the old handbook is mentioned."
  );
});

test("comic reference resolver auto-attaches scratched ring mark prop", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText:
      "Snacri compares the ring symbol with the removed mark from the old plaque.",
    requiredUploads: []
  });

  assert.ok(
    references.some(
      (reference) =>
        reference.relativePath ===
        "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Scratched Ring Mark.jpg"
    ),
    "Expected the scratched ring mark reference to be attached when the ring symbol is mentioned."
  );
});

test("comic reference resolver keeps required old student handbook when cast references are crowded", async () => {
  const references = await resolveComicPageReferenceImages({
    seasonSlug: "season-01",
    chapterSlug: "chapter-01-orientation-week-is-a-scam",
    promptText:
      "Muci, Nia, Snacri, Padaruna, and Sunny Spritz gather at Barrier Sciences Hall while Muci's old Student Handbook (Old Edition) floats nearby.",
    requiredUploads: [
      chapterSceneUpload(
        "season-01-chapter-01-orientation-week-is-a-scam-barrier-sciences-hall",
        "Barrier Sciences Hall",
        "Barrier Sciences Hall.jpg"
      ),
      characterUpload("muci", "Muci Model Sheet"),
      characterUpload("nia", "Nia Model Sheet"),
      characterUpload("padaruna", "Padaruna Model Sheet"),
      characterUpload("snacri", "Snacri Model Sheet"),
      characterUpload("sunny-spritz", "Sunny Spritz Model Sheet"),
      chapterSceneUpload(
        "student-handbook-old-edition",
        "Student Handbook (Old Edition)",
        "Student Handbook (old edition).jpg"
      )
    ]
  });

  assert.ok(
    references.some(
      (reference) =>
        reference.relativePath ===
        "comic/seasons/season-01/chapter-01-orientation-week-is-a-scam/scene-refs/Student Handbook (old edition).jpg"
    ),
    "Expected the required old student handbook reference to survive the reference limit."
  );
  assert.equal(
    references.some((reference) => reference.relativePath.endsWith("Sunscreen Field Handbook.jpg")),
    false
  );
});

test("manual comic reference overrides preserve an intentionally empty selection", () => {
  const references = normalizeComicReferenceImageOverrides([]);

  assert.deepEqual(references, []);
});

test("manual comic reference overrides reject unsafe reference paths", () => {
  const references = normalizeComicReferenceImageOverrides([
    {
      bucket: "CHARACTER",
      slug: "muci",
      label: "Unsafe",
      fileName: "secret.jpg",
      relativePath: "../secret.jpg",
      imageUrl: "/secret.jpg"
    },
    {
      bucket: "CHARACTER",
      slug: "muci",
      label: "Muci model sheet",
      fileName: "model-sheet.jpg",
      relativePath: "comic/characters/muci/refs/model-sheet.jpg",
      imageUrl: "/comic-reference/comic/characters/muci/refs/model-sheet.jpg"
    }
  ]);

  assert.equal(references?.length, 1);
  assert.equal(references?.[0]?.relativePath, "comic/characters/muci/refs/model-sheet.jpg");
  assert.equal(references?.[0]?.source, "manual-selection");
});
