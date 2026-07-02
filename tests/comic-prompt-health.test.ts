import assert from "node:assert/strict";
import test from "node:test";
import type { ParsedComicPromptOutput } from "../lib/comic-prompt-output";
import { getComicPromptHealthSummary } from "../lib/comic-prompt-health";

function buildPromptOutput(overrides: Partial<ParsedComicPromptOutput> = {}): ParsedComicPromptOutput {
  const coverPage: ParsedComicPromptOutput["pages"][number] = {
    pageNumber: 0,
    panelCount: 1,
    pagePurpose: "Cover: Neatique Skincare College logo, Episode 2: Sunscreen Drill, and Ava meeting Coach Ray.",
    promptPackCopyText: [
      "Cover image prompt.",
      "Place the exact Neatique Skincare College comic logo at the top, then render one centered serif title line exactly: Episode 2: Sunscreen Drill.",
      "Use one unified serif font for all cover text.",
      "Use the unified minimalist Japanese manga style and one large framed manga interaction scene.",
      "No character dialogue, no speech balloons, no caption boxes, and no SFX."
    ].join("\n"),
    referenceNotesCopyText:
      "Use the uploaded comiclogo.png brand logo and the listed character references. Keep cover lettering in one serif font.",
    panels: [
      {
        panelNumber: 1,
        panelTitle: "Cover Interaction",
        storyBeat: "Ava and Coach Ray square up for a sunscreen lesson.",
        promptText:
          "Inside the large cover frame, Ava and Coach Ray interact. Render Episode 2: Sunscreen Drill in one serif font above the frame. No dialogue balloons.",
        dialogueLines: []
      }
    ],
    requiredUploads: [
      {
        bucket: "BRAND_LOGO",
        label: "Comic title logo",
        slug: "comic-title-logo",
        whyThisMatters: "Locks the cover title logo.",
        contentSummary: "Exact uploaded comiclogo.png logo.",
        uploadImageNames: ["comiclogo.png"],
        relativePaths: ["/images/comiclogo.png"]
      }
    ]
  };
  const storyPages = Array.from({ length: 10 }, (_, index) => {
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
  const pages = [coverPage, ...storyPages];

  return {
    episodeLogline: "A short logline.",
    episodeSynopsis: "A short synopsis.",
    globalGptImage2Notes: "Use consistent comic lettering.",
    pages,
    ...overrides
  };
}

function characterUpload(name: string, slug: string) {
  return {
    bucket: "CHARACTER" as const,
    label: `${name} Model Sheet`,
    slug,
    whyThisMatters: `${name} identity lock.`,
    contentSummary: `${name} model sheet.`,
    uploadImageNames: ["model-sheet.jpg"],
    relativePaths: [`comic/characters/${slug}/refs/model-sheet.jpg`]
  };
}

test("comic prompt health accepts complete dialogue and lettering prompts", () => {
  const summary = getComicPromptHealthSummary(buildPromptOutput());

  assert.equal(summary.totalPages, 11);
  assert.equal(summary.readyPages, 11);
  assert.equal(summary.issueCount, 0);
});

test("comic prompt health catches missing dialogue in image prompts", () => {
  const promptOutput = buildPromptOutput();
  promptOutput.pages[1].promptPackCopyText = "Page 1 image prompt with lettering but no line text.";

  const summary = getComicPromptHealthSummary(promptOutput);

  assert.equal(summary.readyPages, 10);
  assert.equal(summary.issueCount > 0, true);
  assert.match(summary.pages[1].findings.map((finding) => finding.message).join("\n"), /dialogue/);
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

test("comic prompt health neglects matching QA findings by key", () => {
  const promptOutput = buildPromptOutput();
  promptOutput.pages[0].promptPackCopyText += "\nA handbook floats beside Ava.";
  promptOutput.pages[1].promptPackCopyText += "\nThe handbook returns in close-up.";

  const summary = getComicPromptHealthSummary(promptOutput, {
    neglectedFindingKeys: ["page.recurring-prop.missing-reference:handbook"]
  });

  assert.equal(summary.issueCount, 0);
  assert.equal(summary.warningCount, 0);
  assert.equal(
    summary.pages.some((page) =>
      page.findings.some((finding) => finding.message.includes("handbook"))
    ),
    false
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

test("comic prompt health warns when one panel makes four characters active", () => {
  const promptOutput = buildPromptOutput();
  const page = promptOutput.pages[1];

  page.requiredUploads = [
    characterUpload("Muci", "muci"),
    characterUpload("Padaruna", "padaruna"),
    characterUpload("Snacri", "snacri"),
    characterUpload("Padarana", "padarana")
  ];
  page.promptPackCopyText = [
    "Page 1 image prompt.",
    "Use consistent rounded hand-lettered font, clean lettering, speech balloons, and caption boxes.",
    'Panel 1 dialogue: Muci: "One routine first." Padaruna: "One routine forever?" Snacri: "It is cheaper." Padarana: "Maybe softer."',
    'Panel 2 dialogue: Caption: "The routine did not become calmer."'
  ].join("\n");
  page.panels[0] = {
    panelNumber: 1,
    panelTitle: "Crowded Argument",
    storyBeat: "Muci, Padaruna, Snacri, and Padarana crowd into the foreground together.",
    promptText:
      "Muci, Padaruna, Snacri, and Padarana all speak and react in the same foreground group.",
    dialogueLines: [
      { speaker: "Muci", text: "One routine first." },
      { speaker: "Padaruna", text: "One routine forever?" },
      { speaker: "Snacri", text: "It is cheaper." },
      { speaker: "Padarana", text: "Maybe softer." }
    ]
  };
  page.panels[1].dialogueLines = [
    { speaker: "Caption", text: "The routine did not become calmer." }
  ];

  const summary = getComicPromptHealthSummary(promptOutput);
  const findingKeys = pageFindings(summary, 1).map((finding) => finding.key);

  assert.equal(summary.issueCount, 0);
  assert.equal(findingKeys.includes("page.multi-character.focus-missing"), true);
  assert.equal(findingKeys.includes("panel.active-cast.too-many"), true);
});

test("comic prompt health accepts four-character pages with clear panel focus", () => {
  const promptOutput = buildPromptOutput();
  const page = promptOutput.pages[1];

  page.requiredUploads = [
    characterUpload("Muci", "muci"),
    characterUpload("Padaruna", "padaruna"),
    characterUpload("Snacri", "snacri"),
    characterUpload("Padarana", "padarana")
  ];
  page.promptPackCopyText = [
    "Page 1 image prompt.",
    "Use consistent rounded hand-lettered font, clean lettering, speech balloons, and caption boxes.",
    "Panel 1 foreground active speakers are Muci and Padaruna; Snacri is background closed-mouth and Padarana is off-panel.",
    'Panel 1 dialogue: Muci: "One routine first." Padaruna: "One routine forever?"',
    "Panel 2 foreground active speakers are Snacri and Muci; Padaruna is edge closed-mouth and Padarana stays off-panel.",
    'Panel 2 dialogue: Snacri: "It is cheaper." Muci: "Emotionally?"'
  ].join("\n");
  page.panels = [
    {
      panelNumber: 1,
      panelTitle: "Two-Person Complaint",
      storyBeat:
        "Muci and Padaruna argue in the foreground; Snacri is background closed-mouth and Padarana is off-panel.",
      promptText:
        "Foreground Muci and Padaruna only, speech balloons above them. Snacri stays background closed-mouth; Padarana is off-panel.",
      dialogueLines: [
        { speaker: "Muci", text: "One routine first." },
        { speaker: "Padaruna", text: "One routine forever?" }
      ]
    },
    {
      panelNumber: 2,
      panelTitle: "Two-Person Reply",
      storyBeat:
        "Snacri and Muci speak in the foreground while Padaruna is an edge closed-mouth reaction and Padarana stays off-panel.",
      promptText:
        "Foreground Snacri and Muci only, with Padaruna edge closed-mouth and Padarana off-panel.",
      dialogueLines: [
        { speaker: "Snacri", text: "It is cheaper." },
        { speaker: "Muci", text: "Emotionally?" }
      ]
    }
  ];

  const summary = getComicPromptHealthSummary(promptOutput);
  const findingKeys = pageFindings(summary, 1).map((finding) => finding.key);

  assert.equal(summary.issueCount, 0);
  assert.equal(findingKeys.includes("page.multi-character.focus-missing"), false);
  assert.equal(findingKeys.includes("panel.active-cast.too-many"), false);
});

function pageFindings(summary: ReturnType<typeof getComicPromptHealthSummary>, pageNumber: number) {
  return summary.pages.find((page) => page.pageNumber === pageNumber)?.findings || [];
}
