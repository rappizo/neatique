const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
const DEFAULT_OPENAI_COMIC_MODEL =
  process.env.OPENAI_COMIC_MODEL ||
  process.env.OPENAI_POST_MODEL ||
  process.env.OPENAI_EMAIL_MODEL ||
  "gpt-5.4-mini";
const DEFAULT_OPENAI_COMIC_IMAGE_MODEL = process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2";

type ComicProjectContext = {
  title: string;
  shortDescription: string;
  storyOutline: string;
  worldRules: string;
  visualStyleGuide: string;
  workflowNotes: string | null;
};

type ComicCharacterContext = {
  name: string;
  slug: string;
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceFolder: string;
  referenceNotes: string | null;
  referenceFiles: ComicReferenceFileContext[];
};

type ComicSceneContext = {
  name: string;
  slug: string;
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceFolder: string;
  referenceNotes: string | null;
  referenceFiles: ComicReferenceFileContext[];
};

type ComicReferenceFileContext = {
  label: string;
  fileName: string;
  relativePath: string;
};

type ComicChapterSceneReferenceContext = ComicReferenceFileContext;

type ComicSeasonContext = {
  title: string;
  summary: string;
  outline: string;
};

type ComicChapterContext = {
  title: string;
  summary: string;
  outline: string;
};

type ComicEpisodeContext = {
  title: string;
  summary: string;
  outline: string;
};

export type GeneratedComicPanelPrompt = {
  pageNumber: number;
  panelNumber: number;
  panelTitle: string;
  storyBeat: string;
  promptText: string;
};

export type GeneratedComicPageUpload = {
  bucket: "CHARACTER" | "SCENE" | "CHAPTER_SCENE";
  label: string;
  slug: string;
  whyThisMatters: string;
  contentSummary: string;
  uploadImageNames: string[];
  relativePaths: string[];
};

export type GeneratedComicPagePrompt = {
  pageNumber: number;
  panelCount: 2 | 3;
  pagePurpose: string;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  panels: GeneratedComicPanelPrompt[];
  requiredUploads: GeneratedComicPageUpload[];
};

export type GeneratedComicPromptPackage = {
  episodeLogline: string;
  episodeSynopsis: string;
  episodeScript: string;
  pagePlan: string;
  pages: GeneratedComicPagePrompt[];
  globalGptImage2Notes: string;
};

type GenerateComicPromptPackageInput = {
  project: ComicProjectContext;
  season: ComicSeasonContext;
  chapter: ComicChapterContext;
  episode: ComicEpisodeContext;
  characters: ComicCharacterContext[];
  scenes: ComicSceneContext[];
  chapterSceneReferences: ComicChapterSceneReferenceContext[];
};

function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

export function getOpenAiComicSettings() {
  const apiKey = getOpenAiApiKey();

  return {
    ready: Boolean(apiKey),
    model: DEFAULT_OPENAI_COMIC_MODEL,
    imageModel: DEFAULT_OPENAI_COMIC_IMAGE_MODEL,
    apiKeyConfigured: Boolean(apiKey)
  };
}

function getResponseOutputText(response: any) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const outputBlocks = Array.isArray(response?.output) ? response.output : [];

  for (const block of outputBlocks) {
    const contents = Array.isArray(block?.content) ? block.content : [];
    for (const content of contents) {
      if (typeof content?.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractOpenAiErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return null;
}

function buildCharacterSummary(characters: ComicCharacterContext[]) {
  if (characters.length === 0) {
    return "No characters have been entered yet.";
  }

  return characters
    .map(
      (character) =>
        [
          `- ${character.name} (${character.role})`,
          `  Slug: ${character.slug}`,
          `  Appearance: ${character.appearance}`,
          `  Personality: ${character.personality}`,
          `  Speech guide: ${character.speechGuide}`,
          `  Reference folder: ${character.referenceFolder}`,
          `  Reference notes: ${character.referenceNotes || "None"}`,
          "  Available reference files:",
          buildReferenceFileSummary(character.referenceFiles)
        ].join("\n")
    )
    .join("\n\n");
}

function buildSceneSummary(scenes: ComicSceneContext[]) {
  if (scenes.length === 0) {
    return "No scenes have been entered yet.";
  }

  return scenes
    .map(
      (scene) =>
        [
          `- ${scene.name}`,
          `  Slug: ${scene.slug}`,
          `  Summary: ${scene.summary}`,
          `  Visual notes: ${scene.visualNotes}`,
          `  Mood notes: ${scene.moodNotes}`,
          `  Reference folder: ${scene.referenceFolder}`,
          `  Reference notes: ${scene.referenceNotes || "None"}`,
          "  Available reference files:",
          buildReferenceFileSummary(scene.referenceFiles)
        ].join("\n")
    )
    .join("\n\n");
}

function buildChapterSceneReferenceSummary(sceneReferences: ComicChapterSceneReferenceContext[]) {
  if (sceneReferences.length === 0) {
    return "No chapter-specific scene reference files have been stored yet.";
  }

  return sceneReferences
    .map(
      (sceneReference) =>
        [
          `- ${sceneReference.label}`,
          `  File: ${sceneReference.fileName}`,
          `  Path: ${sceneReference.relativePath}`
        ].join("\n")
    )
    .join("\n\n");
}

function buildReferenceFileSummary(referenceFiles: ComicReferenceFileContext[]) {
  if (referenceFiles.length === 0) {
    return "No reference files stored yet.";
  }

  return referenceFiles
    .map((referenceFile) =>
      [
        `  - ${referenceFile.fileName}`,
        `    Label: ${referenceFile.label}`,
        `    Path: ${referenceFile.relativePath}`
      ].join("\n")
    )
    .join("\n");
}

export async function generateComicPromptPackageWithAi(
  input: GenerateComicPromptPackageInput
): Promise<GeneratedComicPromptPackage> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      episodeLogline: { type: "string", minLength: 30, maxLength: 220 },
      episodeSynopsis: { type: "string", minLength: 120, maxLength: 800 },
      episodeScript: { type: "string", minLength: 500, maxLength: 8000 },
      pagePlan: { type: "string", minLength: 240, maxLength: 6000 },
      pages: {
        type: "array",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            pageNumber: { type: "integer", minimum: 1, maximum: 10 },
            panelCount: { type: "integer", enum: [2, 3] },
            pagePurpose: { type: "string", minLength: 12, maxLength: 220 },
            promptPackCopyText: { type: "string", minLength: 160, maxLength: 2600 },
            referenceNotesCopyText: { type: "string", minLength: 120, maxLength: 2200 },
            panels: {
              type: "array",
              minItems: 2,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  pageNumber: { type: "integer", minimum: 1, maximum: 10 },
                  panelNumber: { type: "integer", minimum: 1, maximum: 3 },
                  panelTitle: { type: "string", minLength: 4, maxLength: 90 },
                  storyBeat: { type: "string", minLength: 12, maxLength: 180 },
                  promptText: { type: "string", minLength: 60, maxLength: 900 }
                },
                required: ["pageNumber", "panelNumber", "panelTitle", "storyBeat", "promptText"]
              }
            },
            requiredUploads: {
              type: "array",
              minItems: 1,
              maxItems: 12,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  bucket: { type: "string", enum: ["CHARACTER", "SCENE", "CHAPTER_SCENE"] },
                  label: { type: "string", minLength: 2, maxLength: 120 },
                  slug: { type: "string", minLength: 1, maxLength: 120 },
                  whyThisMatters: { type: "string", minLength: 12, maxLength: 240 },
                  contentSummary: { type: "string", minLength: 12, maxLength: 320 },
                  uploadImageNames: {
                    type: "array",
                    minItems: 1,
                    maxItems: 8,
                    items: { type: "string", minLength: 3, maxLength: 140 }
                  },
                  relativePaths: {
                    type: "array",
                    minItems: 1,
                    maxItems: 8,
                    items: { type: "string", minLength: 3, maxLength: 240 }
                  }
                },
                required: [
                  "bucket",
                  "label",
                  "slug",
                  "whyThisMatters",
                  "contentSummary",
                  "uploadImageNames",
                  "relativePaths"
                ]
              }
            }
          },
          required: [
            "pageNumber",
            "panelCount",
            "pagePurpose",
            "promptPackCopyText",
            "referenceNotesCopyText",
            "panels",
            "requiredUploads"
          ]
        }
      },
      globalGptImage2Notes: { type: "string", minLength: 120, maxLength: 2600 }
    },
    required: [
      "episodeLogline",
      "episodeSynopsis",
      "episodeScript",
      "pagePlan",
      "pages",
      "globalGptImage2Notes"
    ]
  };

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_COMIC_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are Neatique's comic story architect and prompt planner.",
                "Your job is to turn a season/chapter/episode outline into a production-ready comic prompt package.",
                "Keep characters visually stable, emotionally consistent, and aligned with their stored canon.",
                "You must think like a comic production assistant, not like a novelist only.",
                "Return only valid JSON matching the schema.",
                "Build exactly 10 pages for every episode.",
                "Use 3 panels per page by default. Only use 2 panels when the story beat deserves extra visual space, such as a reveal, pause, emotional beat, or dramatic transition.",
                "Every page must include a prompt block that is ready to copy and paste directly into gpt-image-2 after the right references are uploaded.",
                "Every page must also include a reference-notes block that is ready to copy and paste directly into the image workflow without cleanup.",
                "When you build the upload checklist, explicitly state which character reference images, reusable scene reference images, and chapter scene reference images should be uploaded before using gpt-image-2.",
                "Never invent file names. Only use file names that appear in the provided reference libraries.",
                "Assume the team wants stable characters, reusable scenes, and a polished comic workflow."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Comic project:",
                `Title: ${input.project.title}`,
                `Short description: ${input.project.shortDescription}`,
                `Story outline: ${input.project.storyOutline}`,
                `World rules: ${input.project.worldRules}`,
                `Visual style guide: ${input.project.visualStyleGuide}`,
                `Workflow notes: ${input.project.workflowNotes || "None"}`,
                "",
                "Season context:",
                `Title: ${input.season.title}`,
                `Summary: ${input.season.summary}`,
                `Outline: ${input.season.outline}`,
                "",
                "Chapter context:",
                `Title: ${input.chapter.title}`,
                `Summary: ${input.chapter.summary}`,
                `Outline: ${input.chapter.outline}`,
                "",
                "Episode context:",
                `Title: ${input.episode.title}`,
                `Summary: ${input.episode.summary}`,
                `Outline: ${input.episode.outline}`,
                "",
                "Locked character library:",
                buildCharacterSummary(input.characters),
                "",
                "Locked scene library:",
                buildSceneSummary(input.scenes),
                "",
                "Chapter-specific scene reference files:",
                buildChapterSceneReferenceSummary(input.chapterSceneReferences),
                "",
                "Output requirements:",
                "- Expand the episode into a readable production script.",
                "- Create a 10-page plan.",
                "- Every page should normally contain 3 panels.",
                "- A page may contain 2 panels only when the beat is visually important enough to justify extra space.",
                `- Assume the image generation step will use ${DEFAULT_OPENAI_COMIC_IMAGE_MODEL}.`,
                "- For every page, return a promptPackCopyText block that can be pasted directly into the image-generation tool.",
                "- For every page, return a referenceNotesCopyText block that can also be pasted directly into the image-generation tool or production notes.",
                "- For every panel, tell the team which visual beat is happening and what needs to stay stable.",
                "- Prefer the chapter-specific scene reference files whenever the page happens in a known chapter scene location.",
                "- Required uploads must be organized per page, and each item must include real upload image file names plus the matching relative paths.",
                "- Use CHARACTER for character model sheets, SCENE for reusable master location refs, and CHAPTER_SCENE for chapter-only location sheets.",
                "- The global gpt-image-2 notes should explain how to preserve continuity, camera logic, and reference reuse across all 10 pages.",
                "- Keep the tone useful, concrete, and ready for actual image production."
              ].join("\n")
            }
          ]
        }
      ],
      reasoning: {
        effort: "medium"
      },
      text: {
        format: {
          type: "json_schema",
          name: "comic_prompt_package",
          strict: true,
          schema
        }
      }
    })
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI request failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);

  if (!outputText) {
    throw new Error("OpenAI did not return a comic prompt package.");
  }

  const output = safeJsonParse(outputText);
  const normalizedOutput = output && typeof output === "object" ? (output as Record<string, unknown>) : null;

  if (
    !normalizedOutput ||
    typeof normalizedOutput.episodeLogline !== "string" ||
    typeof normalizedOutput.episodeSynopsis !== "string" ||
    typeof normalizedOutput.episodeScript !== "string" ||
    typeof normalizedOutput.pagePlan !== "string" ||
    !Array.isArray(normalizedOutput.pages) ||
    typeof normalizedOutput.globalGptImage2Notes !== "string"
  ) {
    throw new Error("OpenAI returned an invalid comic prompt package.");
  }

  const pages = normalizedOutput.pages as GeneratedComicPagePrompt[];
  const hasValidPageShape =
    pages.length === 10 &&
    pages.every((page, pageIndex) => {
      return (
        page &&
        typeof page === "object" &&
        page.pageNumber === pageIndex + 1 &&
        (page.panelCount === 2 || page.panelCount === 3) &&
        Array.isArray(page.panels) &&
        page.panels.length === page.panelCount &&
        Array.isArray(page.requiredUploads) &&
        typeof page.promptPackCopyText === "string" &&
        typeof page.referenceNotesCopyText === "string"
      );
    });

  if (!hasValidPageShape) {
    throw new Error("OpenAI returned pages that do not match the 10-page comic workflow.");
  }

  const normalizedPages = pages
    .map((page) => ({
      ...page,
      panels: [...page.panels].sort((left, right) => left.panelNumber - right.panelNumber),
      requiredUploads: [...page.requiredUploads]
        .map((upload) => ({
          ...upload,
          uploadImageNames: [...upload.uploadImageNames].sort((left, right) => left.localeCompare(right)),
          relativePaths: [...upload.relativePaths].sort((left, right) => left.localeCompare(right))
        }))
        .sort((left, right) => {
          const bucketOrder = `${left.bucket}-${left.label}`;
          const nextBucketOrder = `${right.bucket}-${right.label}`;
          return bucketOrder.localeCompare(nextBucketOrder);
        })
    }))
    .sort((left, right) => left.pageNumber - right.pageNumber);

  return {
    episodeLogline: normalizedOutput.episodeLogline.trim(),
    episodeSynopsis: normalizedOutput.episodeSynopsis.trim(),
    episodeScript: normalizedOutput.episodeScript.trim(),
    pagePlan: normalizedOutput.pagePlan.trim(),
    pages: normalizedPages,
    globalGptImage2Notes: normalizedOutput.globalGptImage2Notes.trim()
  };
}
