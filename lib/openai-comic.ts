import { Buffer } from "node:buffer";

function normalizeApiBaseUrl(value: string) {
  return (value.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

const OPENAI_API_BASE_URL = normalizeApiBaseUrl(
  process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1"
);
const OPENAI_COMIC_IMAGE_API_BASE_URL = normalizeApiBaseUrl(
  process.env.OPENAI_COMIC_IMAGE_API_BASE_URL || OPENAI_API_BASE_URL
);
const DEFAULT_OPENAI_COMIC_MODEL =
  process.env.OPENAI_COMIC_MODEL ||
  process.env.OPENAI_POST_MODEL ||
  process.env.OPENAI_EMAIL_MODEL ||
  "gpt-5.5";
const DEFAULT_OPENAI_COMIC_IMAGE_MODEL = process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2";
const COMIC_VISUAL_PRODUCTION_LOCKS = [
  "Non-negotiable visual production locks:",
  "- Output must be black-and-white manga only: black ink linework, white paper, grayscale screentone, hatching, and manga shadow shapes. No color, no colored accents, no painterly full-color lighting.",
  "- Keep the overall feeling cute, soft, polished, and mascot-like, not gritty or horror-styled.",
  "- Character model sheets are the highest visual authority and must be treated as exact identity locks, not inspiration. Match the uploaded model sheet for silhouette, face placement, eye spacing, highlight placement, line weight, body proportions, feet/leg nubs, and point direction.",
  "- Do not redesign Muci. Muci must stay a cute friendly teardrop mascot with a centered point, rounded base, large dot eyes, an open friendly smile, glossy highlight marks near the upper-left side, two small rounded feet at the bottom, and soft approachable protagonist energy.",
  "- For any full-body Muci view, show the two small rounded feet exactly like the model sheet. Do not crop them away, hide them, replace them with a flat base, or remove them.",
  "- All characters in this world have no hands and no arms. Never draw arms, hands, fingers, paws, gloves, sleeves, wrists, elbows, or humanoid upper limbs on any character.",
  "- Preserve any feet, lower body nubs, base shape, or tiny legs exactly as shown in each character's model sheet.",
  "- Characters interact with nearby objects through gentle telekinesis. Show objects floating, tilting, sliding, or opening near them with small motion lines, glow cues, or manga emphasis marks instead of hands touching objects.",
  "- If a story beat mentions holding, pointing, grabbing, writing, pushing, opening, carrying, or handing something over, translate that action into telekinetic object movement while keeping every character handless.",
  "- Avoid adding extra characters, props, logos, product labels, watermarks, signatures, or random text."
].join("\n");

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

export type GenerateComicPageImageInput = {
  projectTitle: string;
  seasonTitle: string;
  chapterTitle: string;
  episodeTitle: string;
  episodeSummary: string;
  pageNumber: number;
  panelCount: number;
  pagePurpose: string;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  globalGptImage2Notes: string | null;
  panels: GeneratedComicPanelPrompt[];
  requiredUploads: GeneratedComicPageUpload[];
};

export type GeneratedComicPageImageAsset = {
  mimeType: string;
  base64Data: string;
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

function getComicImageApiSettings() {
  const comicImageApiKey = (process.env.OPENAI_COMIC_IMAGE_API_KEY || "").trim();

  if (comicImageApiKey) {
    return {
      apiKey: comicImageApiKey,
      baseUrl: OPENAI_COMIC_IMAGE_API_BASE_URL,
      apiKeySource: "OPENAI_COMIC_IMAGE_API_KEY"
    };
  }

  return {
    apiKey: getOpenAiApiKey(),
    baseUrl: OPENAI_API_BASE_URL,
    apiKeySource: "OPENAI_API_KEY"
  };
}

export function getOpenAiComicSettings() {
  const apiKey = getOpenAiApiKey();
  const imageApiSettings = getComicImageApiSettings();

  return {
    ready: Boolean(apiKey),
    imageReady: Boolean(imageApiSettings.apiKey),
    model: DEFAULT_OPENAI_COMIC_MODEL,
    imageModel: DEFAULT_OPENAI_COMIC_IMAGE_MODEL,
    apiKeyConfigured: Boolean(apiKey),
    imageApiKeyConfigured: Boolean(imageApiSettings.apiKey),
    imageApiKeySource: imageApiSettings.apiKeySource,
    imageApiBaseUrl: imageApiSettings.baseUrl
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

function parseImageBase64Response(value: string): GeneratedComicPageImageAsset {
  const dataUrlMatch = value.match(/^data:([^;]+);base64,([\s\S]+)$/);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1] || "image/png",
      base64Data: dataUrlMatch[2].trim()
    };
  }

  return {
    mimeType: "image/png",
    base64Data: value
  };
}

async function fetchImageUrlAsBase64(url: string): Promise<GeneratedComicPageImageAsset> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Comic image API returned a URL, but downloading it failed with ${response.status}.`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType: contentType,
    base64Data: Buffer.from(arrayBuffer).toString("base64")
  };
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

function buildComicPageUploadSummary(uploads: GeneratedComicPageUpload[]) {
  if (uploads.length === 0) {
    return "No required reference uploads were listed for this page.";
  }

  return uploads
    .map((upload) =>
      [
        `- ${upload.label} (${upload.bucket})`,
        `  Why it matters: ${upload.whyThisMatters}`,
        `  Visual lock: ${upload.contentSummary}`,
        `  Upload image names: ${upload.uploadImageNames.join(", ") || "None listed"}`,
        `  Workspace paths: ${upload.relativePaths.join(", ") || "None listed"}`
      ].join("\n")
    )
    .join("\n\n");
}

function buildComicPagePanelSummary(panels: GeneratedComicPanelPrompt[]) {
  if (panels.length === 0) {
    return "No panel beats were listed for this page.";
  }

  return panels
    .map((panel) =>
      [
        `Panel ${panel.panelNumber}: ${panel.panelTitle}`,
        `Story beat: ${panel.storyBeat}`,
        `Panel image direction: ${panel.promptText || "Use the page prompt and story beat."}`
      ].join("\n")
    )
    .join("\n\n");
}

export function buildComicPageImagePrompt(input: GenerateComicPageImageInput) {
  return [
    "Create one finished vertical comic page for Neatique's original comic series.",
    COMIC_VISUAL_PRODUCTION_LOCKS,
    "",
    "Canvas and layout requirements:",
    "- Aspect ratio must be 2:3 vertical.",
    `- The page must contain exactly ${input.panelCount} panel${input.panelCount === 1 ? "" : "s"}.`,
    "- Use clear manga/webcomic page composition with clean panel gutters.",
    "- Keep the page suitable for a polished brand comic, not a rough storyboard.",
    "- Preserve character shape, facial expression language, and scene continuity from the reference notes.",
    "- Treat all listed character model sheets as exact identity references, not loose inspiration.",
    "- If dialogue balloons are needed, keep text minimal, clean, and readable; otherwise use expressive acting and leave balloons simple.",
    "",
    "Story context:",
    `Project: ${input.projectTitle}`,
    `Season: ${input.seasonTitle}`,
    `Chapter: ${input.chapterTitle}`,
    `Episode: ${input.episodeTitle}`,
    `Episode summary: ${input.episodeSummary || "No episode summary stored."}`,
    `Page ${input.pageNumber} purpose: ${input.pagePurpose}`,
    "",
    "Required references for visual continuity:",
    buildComicPageUploadSummary(input.requiredUploads),
    "",
    "Panel-by-panel content to illustrate:",
    buildComicPagePanelSummary(input.panels),
    "",
    "Production prompt already prepared for this page:",
    input.promptPackCopyText,
    "",
    input.globalGptImage2Notes
      ? `Global gpt-image-2 continuity notes:\n${input.globalGptImage2Notes}`
      : "Global gpt-image-2 continuity notes: none stored.",
    "",
    input.referenceNotesCopyText
      ? `Page-specific reference notes:\n${input.referenceNotesCopyText}`
      : "Page-specific reference notes: none stored.",
    "",
    "Final output: one complete 2:3 comic page image, not separate files."
  ].join("\n");
}

export async function generateComicPageImageWithAi(
  input: GenerateComicPageImageInput
): Promise<GeneratedComicPageImageAsset> {
  const imageApiSettings = getComicImageApiSettings();

  if (!imageApiSettings.apiKey) {
    throw new Error("Comic image API key is not configured.");
  }

  const prompt = buildComicPageImagePrompt(input);

  const response = await fetch(`${imageApiSettings.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${imageApiSettings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_COMIC_IMAGE_MODEL,
      prompt,
      size: "1024x1536",
      quality: "medium"
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
        : null) || `OpenAI comic page image generation failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";
  const imageUrl = typeof data?.[0]?.url === "string" ? data[0].url.trim() : "";

  if (!base64Data) {
    if (imageUrl) {
      return fetchImageUrlAsBase64(imageUrl);
    }

    throw new Error("Comic image API did not return a comic page image.");
  }

  return parseImageBase64Response(base64Data);
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
                "Every visual prompt must enforce black-and-white manga output only.",
                "Every visual prompt must enforce that all characters have no hands and no arms, while preserving any feet or lower-body nubs exactly as shown in their model sheets.",
                "Any action that would normally require hands must be staged as gentle telekinesis: nearby objects float, slide, open, tilt, or move with manga motion cues.",
                "Muci must always match the Muci model sheet and written appearance lock exactly: cute friendly teardrop mascot, centered point, rounded base, large dot eyes, open friendly smile, glossy highlight marks near the upper-left side, two small rounded feet at the bottom, soft approachable protagonist energy.",
                "For full-body Muci views, never omit the two small rounded feet or flatten the base; keep the same feet shown in the model sheet.",
                "Never invent arms, hands, fingers, gloves, sleeves, humanoid bodies, animal paws, or redesigned mascot silhouettes.",
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
                "Global visual production locks that must appear in the page prompts and notes:",
                COMIC_VISUAL_PRODUCTION_LOCKS,
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
                "- Every promptPackCopyText block must state black-and-white manga only, no color.",
                "- Every promptPackCopyText block must state that characters have no hands or arms, while preserving model-sheet feet or lower-body nubs exactly.",
                "- Every promptPackCopyText block must translate hand actions into telekinetic object movement.",
                "- Every Muci prompt must explicitly preserve his model-sheet identity, cute centered-teardrop design, and two small rounded feet.",
                "- Every referenceNotesCopyText block must remind production that character model sheets are exact identity locks, not loose inspiration.",
                "- For every page, return a promptPackCopyText block that can be pasted directly into the image-generation tool.",
                "- For every page, return a referenceNotesCopyText block that can also be pasted directly into the image-generation tool or production notes.",
                "- For every panel, tell the team which visual beat is happening and what needs to stay stable.",
                "- Prefer the chapter-specific scene reference files whenever the page happens in a known chapter scene location.",
                "- Required uploads must be organized per page, and each item must include real upload image file names plus the matching relative paths.",
                "- Use CHARACTER for character model sheets, SCENE for reusable master location refs, and CHAPTER_SCENE for chapter-only location sheets.",
                "- The global gpt-image-2 notes should explain how to preserve continuity, camera logic, reference reuse, black-and-white manga style, model-sheet exactness, and handless telekinetic action across all 10 pages.",
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
