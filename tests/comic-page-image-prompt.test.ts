import assert from "node:assert/strict";
import test from "node:test";
import { buildComicPageImagePrompt } from "../lib/openai-comic";

function makeLongText(seed: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${seed} ${index + 1}.`).join(" ");
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
