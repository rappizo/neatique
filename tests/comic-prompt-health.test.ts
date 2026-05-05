import assert from "node:assert/strict";
import test from "node:test";
import type { ParsedComicPromptOutput } from "../lib/comic-prompt-output";
import { getComicPromptHealthSummary } from "../lib/comic-prompt-health";

function buildPromptOutput(overrides: Partial<ParsedComicPromptOutput> = {}): ParsedComicPromptOutput {
  const pages = Array.from({ length: 10 }, (_, index) => {
    const pageNumber = index + 1;
    const dialogueText = `Line ${pageNumber}`;
    const captionText = `Caption ${pageNumber}`;

    return {
      pageNumber,
      panelCount: 2,
      pagePurpose: `Page ${pageNumber}`,
      promptPackCopyText: [
        `Page ${pageNumber} image prompt.`,
        "Use consistent rounded hand-lettered font, clean lettering, speech balloons, and caption boxes.",
        `Visible dialogue: Ava: "${dialogueText}" Caption: "${captionText}"`
      ].join("\n"),
      referenceNotesCopyText: "Use the listed references.",
      panels: [
        {
          panelNumber: 1,
          panelTitle: "Opening",
          storyBeat: "Ava enters.",
          promptText: "Ava enters with a speech balloon.",
          dialogueLines: [{ speaker: "Ava", text: dialogueText }]
        },
        {
          panelNumber: 2,
          panelTitle: "Reaction",
          storyBeat: "The scene responds.",
          promptText: "Hold the same font style in the caption box.",
          dialogueLines: [{ speaker: "Caption", text: captionText }]
        }
      ],
      requiredUploads: []
    };
  });

  return {
    episodeLogline: "A short logline.",
    episodeSynopsis: "A short synopsis.",
    globalGptImage2Notes: "Use consistent comic lettering.",
    pages,
    ...overrides
  };
}

test("comic prompt health accepts complete dialogue and lettering prompts", () => {
  const summary = getComicPromptHealthSummary(buildPromptOutput());

  assert.equal(summary.totalPages, 10);
  assert.equal(summary.readyPages, 10);
  assert.equal(summary.issueCount, 0);
});

test("comic prompt health catches missing dialogue in image prompts", () => {
  const promptOutput = buildPromptOutput();
  promptOutput.pages[0].promptPackCopyText = "Page 1 image prompt with lettering but no line text.";

  const summary = getComicPromptHealthSummary(promptOutput);

  assert.equal(summary.readyPages, 9);
  assert.equal(summary.issueCount > 0, true);
  assert.match(summary.pages[0].findings.map((finding) => finding.message).join("\n"), /dialogue/);
});

test("comic prompt health warns when recurring props lack a continuity reference", () => {
  const promptOutput = buildPromptOutput();
  promptOutput.pages[0].promptPackCopyText += "\nA handbook floats beside Ava.";
  promptOutput.pages[1].promptPackCopyText += "\nThe handbook returns in close-up.";

  const summary = getComicPromptHealthSummary(promptOutput);

  assert.equal(summary.issueCount, 0);
  assert.equal(summary.warningCount > 0, true);
  assert.match(
    summary.pages[0].findings.map((finding) => finding.message).join("\n"),
    /Recurring prop "handbook"/
  );
});

test("comic prompt health accepts recurring props with a continuity reference", () => {
  const promptOutput = buildPromptOutput();
  const handbookReference = {
    bucket: "CHAPTER_SCENE" as const,
    label: "Sunscreen Field Handbook",
    slug: "sunscreen-field-handbook",
    whyThisMatters: "Locks the recurring handbook prop.",
    contentSummary: "Exact handbook prop reference.",
    uploadImageNames: ["Sunscreen Field Handbook.jpg"],
    relativePaths: ["comic/seasons/season-01/chapter-01/scene-refs/Sunscreen Field Handbook.jpg"]
  };
  promptOutput.pages[0].promptPackCopyText += "\nA handbook floats beside Ava.";
  promptOutput.pages[1].promptPackCopyText += "\nThe handbook returns in close-up.";
  promptOutput.pages[0].requiredUploads = [handbookReference];
  promptOutput.pages[1].requiredUploads = [handbookReference];

  const summary = getComicPromptHealthSummary(promptOutput);

  assert.equal(summary.issueCount, 0);
  assert.equal(summary.warningCount, 0);
});

test("comic prompt health ignores ambient recurring objects", () => {
  const promptOutput = buildPromptOutput();
  promptOutput.pages[0].promptPackCopyText += "\nA bottle, card, and shelf sit in the background.";
  promptOutput.pages[1].promptPackCopyText += "\nThe bottle, card, and shelf appear again as room dressing.";

  const summary = getComicPromptHealthSummary(promptOutput);

  assert.equal(summary.issueCount, 0);
  assert.equal(summary.warningCount, 0);
});

test("comic prompt health warns for contextual objects when they affect the story", () => {
  const promptOutput = buildPromptOutput();
  promptOutput.pages[0].promptPackCopyText += "\nA hidden bottle clue floats beside Ava.";
  promptOutput.pages[1].promptPackCopyText += "\nThe bottle clue returns in close-up.";

  const summary = getComicPromptHealthSummary(promptOutput);

  assert.equal(summary.issueCount, 0);
  assert.equal(summary.warningCount > 0, true);
  assert.match(
    summary.pages[0].findings.map((finding) => finding.message).join("\n"),
    /Recurring prop "bottle"/
  );
});
