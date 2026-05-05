import assert from "node:assert/strict";
import test from "node:test";
import {
  buildComicPageImagePrompt,
  selectComicPageImageReferenceImages
} from "../lib/openai-comic";
import type { ComicReferenceImageFile } from "../lib/comic-reference-images";

function makeLongText(seed: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${seed} ${index + 1}.`).join(" ");
}

function referenceImage(input: {
  label: string;
  slug: string;
  bucket: ComicReferenceImageFile["bucket"];
  relativePath: string;
  source?: ComicReferenceImageFile["source"];
}): ComicReferenceImageFile {
  const fileName = input.relativePath.split("/").pop() || "model-sheet.jpg";

  return {
    label: input.label,
    fileName,
    relativePath: input.relativePath,
    bucket: input.bucket,
    slug: input.slug,
    source: input.source || "prompt-required-upload",
    mimeType: "image/jpeg",
    imageUrl: `/${input.relativePath}`,
    sizeBytes: 4,
    whyThisMatters: `${input.label} identity lock.`,
    contentSummary: `${input.label} visual lock.`,
    data: Buffer.from("fake")
  };
}

test("comic page image prompt stays under OpenAI length limit while preserving reference locks", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Sunscreen Drill",
    episodeSummary: makeLongText("Episode summary keeps continuity context", 220),
    pageNumber: 1,
    panelCount: 5,
    pagePurpose: makeLongText("Page purpose mentions refs/model-sheet.png for legacy cleanup", 120),
    promptPackCopyText: makeLongText("Production prompt cites comic/characters/muci/refs/model-sheet.png", 900),
    referenceNotesCopyText: makeLongText("Reference notes cite refs/model-sheet.png", 420),
    globalGptImage2Notes: makeLongText("Global notes cite model-sheet.png", 420),
    panels: [
      {
        pageNumber: 1,
        panelNumber: 1,
        panelTitle: "Opening",
        storyBeat: makeLongText("Muci enters the sunscreen field", 160),
        promptText: makeLongText("Draw Muci with the model sheet", 180),
        dialogueLines: [{ speaker: "Muci", text: "I brought sunscreen." }]
      }
    ],
    requiredUploads: [
      {
        label: "Muci model sheet",
        slug: "muci",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.png"],
        relativePaths: ["comic/characters/muci/refs/model-sheet.png"],
        whyThisMatters: makeLongText("Identity lock", 120),
        contentSummary: makeLongText("Legacy model-sheet.png should normalize", 120)
      }
    ],
    referenceImages: [
      {
        label: "Muci model sheet",
        fileName: "model-sheet.jpg",
        relativePath: "comic/characters/muci/refs/model-sheet.jpg",
        bucket: "CHARACTER",
        slug: "muci",
        source: "prompt-required-upload",
        mimeType: "image/jpeg",
        imageUrl: "/comic/characters/muci/refs/model-sheet.jpg",
        sizeBytes: 4,
        whyThisMatters: "Muci identity lock.",
        contentSummary: "Muci exact model-sheet reference.",
        data: Buffer.from("fake")
      }
    ],
    characterLocks: [
      {
        slug: "muci",
        name: "Muci",
        role: "Audience surrogate.",
        appearance: makeLongText("Profile MD appearance lock says use refs/model-sheet.png", 220),
        personality: "Curious and warm.",
        speechGuide: "Gentle, concise, curious lines.",
        referenceNotes: makeLongText("Profile MD reference lock says model-sheet.png", 180),
        profileMarkdown: makeLongText("Profile MD source of truth repeats refs/model-sheet.png", 900),
        referenceFiles: [
          {
            label: "Model Sheet",
            fileName: "model-sheet.jpg",
            relativePath: "comic/characters/muci/refs/model-sheet.jpg",
            extension: "jpg"
          }
        ]
      }
    ],
    generationAttempt: 1
  });

  assert.ok(prompt.length <= 30000, `Prompt length ${prompt.length} should stay under 30000.`);
  assert.doesNotMatch(prompt, /model-sheet\.png|refs\/model-sheet\.png/);
  assert.match(prompt, /model-sheet\.jpg/);
  assert.match(prompt, /Profile MD source of truth loaded from database/);
  assert.match(prompt, /Reference image files: model-sheet\.jpg/);
});

test("comic page image prompt separates Coach Ray from Muci and normalizes legacy pentagonal wording", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Sunscreen Drill",
    episodeSummary: "Coach Ray drills Muci on sunscreen planning.",
    pageNumber: 5,
    panelCount: 3,
    pagePurpose: "Coach Ray and Muci compare panic with planning.",
    promptPackCopyText:
      "Use exact uploaded model sheets. Coach Ray must stay broad pentagonal and planted. Muci stays the broad squat model-sheet droplet with a subtle near-center reader-left top lean.",
    referenceNotesCopyText:
      "Upload Muci and Coach Ray. Keep Coach Ray's pentagonal authority and Muci's broad squat soft droplet.",
    globalGptImage2Notes:
      "Coach Ray remains broad pentagonal, planted, and authoritative. Muci remains broad, squat, round-lower-half-heavy, and browless.",
    panels: [
      {
        pageNumber: 5,
        panelNumber: 1,
        panelTitle: "Planning",
        storyBeat: "Coach Ray gives the lesson while Muci listens.",
        promptText: "Coach Ray must stay broad pentagonal and Muci stays teardrop.",
        dialogueLines: [
          { speaker: "Coach Ray", text: "Planning beats drama!" },
          { speaker: "Muci", text: "That actually helps." }
        ]
      }
    ],
    requiredUploads: [
      {
        label: "Coach Ray Model Sheet",
        slug: "coach-ray",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/coach-ray/refs/model-sheet.jpg"],
        whyThisMatters: "Coach Ray teaches the reapplication lesson.",
        contentSummary: "Exact Coach Ray pentagonal shape and feet."
      },
      {
        label: "Muci Model Sheet",
        slug: "muci",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/muci/refs/model-sheet.jpg"],
        whyThisMatters: "Muci asks the reader question.",
        contentSummary: "Exact Muci teardrop shape and feet."
      }
    ],
    referenceImages: [
      {
        label: "Coach Ray Model Sheet",
        fileName: "model-sheet.jpg",
        relativePath: "comic/characters/coach-ray/refs/model-sheet.jpg",
        bucket: "CHARACTER",
        slug: "coach-ray",
        source: "prompt-required-upload",
        mimeType: "image/jpeg",
        imageUrl: "/comic/characters/coach-ray/refs/model-sheet.jpg",
        sizeBytes: 4,
        whyThisMatters: "Coach Ray identity lock.",
        contentSummary: "Exact Coach Ray pentagonal shape and feet.",
        data: Buffer.from("fake")
      },
      {
        label: "Muci Model Sheet",
        fileName: "model-sheet.jpg",
        relativePath: "comic/characters/muci/refs/model-sheet.jpg",
        bucket: "CHARACTER",
        slug: "muci",
        source: "prompt-required-upload",
        mimeType: "image/jpeg",
        imageUrl: "/comic/characters/muci/refs/model-sheet.jpg",
        sizeBytes: 4,
        whyThisMatters: "Muci identity lock.",
        contentSummary: "Exact Muci teardrop shape and feet.",
        data: Buffer.from("fake")
      }
    ],
    characterLocks: [
      {
        slug: "coach-ray",
        name: "Coach Ray",
        role: "Sunscreen instructor.",
        appearance: "Broad shield-shaped mascot silhouette, not Muci.",
        personality: "Commanding.",
        speechGuide: "Short commands.",
        referenceNotes:
          "Use refs/model-sheet.jpg. Never borrow Muci's teardrop outline. Never describe Coach Ray as pentagonal.",
        profileMarkdown:
          "# Coach Ray\n\n## Appearance lock\nBroad squat shield-shaped protective mascot, centered shallow top crest, near-vertical sides, broad rounded lower body.",
        referenceFiles: [
          {
            label: "Model Sheet",
            fileName: "model-sheet.jpg",
            relativePath: "comic/characters/coach-ray/refs/model-sheet.jpg",
            extension: "jpg"
          }
        ]
      },
      {
        slug: "muci",
        name: "Muci",
        role: "Audience surrogate.",
        appearance:
          "Broad squat model-sheet droplet with a natural rounded top point and subtle near-center reader-left lean.",
        personality: "Curious.",
        speechGuide: "Plainspoken.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown:
          "# Muci\n\n## Appearance lock\nMuci Model Sheet Exact Lock: broad squat pure-white droplet with a natural rounded top point and subtle near-center reader-left lean.",
        referenceFiles: [
          {
            label: "Model Sheet",
            fileName: "model-sheet.jpg",
            relativePath: "comic/characters/muci/refs/model-sheet.jpg",
            extension: "jpg"
          }
        ]
      }
    ],
    generationAttempt: 1
  });

  assert.doesNotMatch(prompt, /Coach Ray[^.\n]*pentagonal/i);
  assert.doesNotMatch(prompt, /broad pentagonal/i);
  assert.doesNotMatch(prompt, /pentagonal authority/i);
  assert.match(prompt, /Coach Ray anti-drift lock/);
  assert.match(prompt, /Muci vs Coach Ray separation/);
  assert.match(prompt, /Coach Ray keeps the broad squat shield-shaped/);
});

test("comic page image prompt includes similar teardrop separation locks", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Group Panel",
    episodeSummary: "Several similar teardrop characters compare notes.",
    pageNumber: 1,
    panelCount: 1,
    pagePurpose: "Keep similar black-and-white characters distinct.",
    promptPackCopyText: "Muci, Nia, and Snacri stand together.",
    referenceNotesCopyText: "Use model sheets.",
    globalGptImage2Notes: "Keep silhouettes distinct.",
    panels: [
      {
        pageNumber: 1,
        panelNumber: 1,
        panelTitle: "Lineup",
        storyBeat: "Muci, Nia, and Snacri share a panel.",
        promptText: "Muci is compact, Nia has one angled brow, Snacri leans left.",
        dialogueLines: [{ speaker: "Muci", text: "We look different, right?" }]
      }
    ],
    requiredUploads: [],
    referenceImages: [
      {
        label: "Similar Teardrop Character Comparison",
        fileName: "similar-character-comparison.jpg",
        relativePath: "comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
        bucket: "CAST_COMPARISON",
        slug: "similar-teardrop-character-comparison",
        source: "auto-detected",
        mimeType: "image/jpeg",
        imageUrl: "/comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
        sizeBytes: 4,
        whyThisMatters: "Similar teardrop characters appear together.",
        contentSummary: "Difference map for similar droplet characters.",
        data: Buffer.from("fake")
      }
    ],
    characterLocks: [
      {
        slug: "muci",
        name: "Muci",
        role: "Audience surrogate.",
        appearance:
          "Broad squat model-sheet droplet with a natural rounded top point and subtle near-center reader-left lean.",
        personality: "Curious.",
        speechGuide: "Plainspoken.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Muci",
        referenceFiles: []
      },
      {
        slug: "nia",
        name: "Nia",
        role: "Top student.",
        appearance: "Tall sharp pointed teardrop with one angled left brow.",
        personality: "Precise.",
        speechGuide: "Concise.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Nia",
        referenceFiles: []
      },
      {
        slug: "snacri",
        name: "Snacri",
        role: "Quiet observer.",
        appearance: "Fatter left-leaning droplet.",
        personality: "Minimal.",
        speechGuide: "Sparse.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Snacri",
        referenceFiles: []
      }
    ],
    generationAttempt: 1
  });

  assert.match(prompt, /Similar teardrop cast separation lock/);
  assert.match(prompt, /Muci Model Sheet Exact Lock/);
  assert.match(prompt, /Muci\/Nia high-risk model-sheet guardrail/);
  assert.match(prompt, /subtle near-center lean toward reader-left\/Muci's right/);
  assert.match(prompt, /not a sharp Nia point, exaggerated hook, sideways curl, or flopped-over cap/);
  assert.match(prompt, /Muci: exact Muci model-sheet droplet/);
  assert.match(prompt, /Nia: taller and sharper pointed teardrop/);
  assert.match(prompt, /Snacri: fatter quiet droplet/);
  assert.match(prompt, /Similar Teardrop Character Comparison/);
});

test("comic page image reference selection keeps similar teardrop comparison during retries", () => {
  const previousLimit = process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
  process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = "4";

  try {
    const selected = selectComicPageImageReferenceImages(
      [
        referenceImage({
          label: "Muci Model Sheet",
          slug: "muci",
          bucket: "CHARACTER",
          relativePath: "comic/characters/muci/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Nia Model Sheet",
          slug: "nia",
          bucket: "CHARACTER",
          relativePath: "comic/characters/nia/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Snacri Model Sheet",
          slug: "snacri",
          bucket: "CHARACTER",
          relativePath: "comic/characters/snacri/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Padaruna Model Sheet",
          slug: "padaruna",
          bucket: "CHARACTER",
          relativePath: "comic/characters/padaruna/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Similar Teardrop Character Comparison",
          slug: "similar-teardrop-character-comparison",
          bucket: "CAST_COMPARISON",
          relativePath: "comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
          source: "auto-detected"
        })
      ],
      2
    );

    assert.equal(selected.length, 4);
    assert.ok(selected.some((reference) => reference.slug === "muci"));
    assert.ok(selected.some((reference) => reference.slug === "nia"));
    assert.ok(
      selected.some((reference) => reference.slug === "similar-teardrop-character-comparison"),
      "The comparison sheet should not be dropped when retry mode prioritizes identity references."
    );
  } finally {
    if (previousLimit === undefined) {
      delete process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
    } else {
      process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = previousLimit;
    }
  }
});
