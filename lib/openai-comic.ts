import { Buffer } from "node:buffer";
import type { ComicReferenceImageFile } from "@/lib/comic-reference-images";
import type { ComicCharacterIdentityLock } from "@/lib/comic-character-identity";

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
const DEFAULT_OPENAI_COMIC_OUTLINE_MODEL =
  process.env.OPENAI_COMIC_OUTLINE_MODEL || DEFAULT_OPENAI_COMIC_MODEL;
const DEFAULT_OPENAI_COMIC_PROMPT_MODEL =
  process.env.OPENAI_COMIC_PROMPT_MODEL || DEFAULT_OPENAI_COMIC_MODEL;
const OPENAI_COMIC_OUTLINE_REASONING_EFFORT =
  process.env.OPENAI_COMIC_OUTLINE_REASONING_EFFORT || "low";
const OPENAI_COMIC_PROMPT_REASONING_EFFORT =
  process.env.OPENAI_COMIC_PROMPT_REASONING_EFFORT || "low";
const DEFAULT_OPENAI_COMIC_OUTLINE_TIMEOUT_MS = 1000 * 55;
const DEFAULT_OPENAI_COMIC_PROMPT_TIMEOUT_MS = 1000 * 55;
const DEFAULT_OPENAI_COMIC_IMAGE_TIMEOUT_MS = 1000 * 52;
const DEFAULT_OPENAI_COMIC_IMAGE_MODEL = process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2";
const COMIC_VISUAL_PRODUCTION_LOCKS = [
  "Non-negotiable visual production locks:",
  "- Output must be clean black-and-white Japanese manga only: crisp black ink linework on pure white paper, clear white space, sparse screentone only where needed, and high-contrast readable panels. No color, no colored accents, no gray wash, no muddy charcoal shading, no painterly full-color lighting.",
  "- Character bodies must have pure white interior fill like the model sheets. Do not fill Muci or other mascot characters with gray, gradient shading, heavy screentone, airbrush texture, or smoky shadows.",
  "- Keep screentone and hatching light and controlled; use it mainly for backgrounds, cast shadows, and mood accents, not as a gray overlay across the whole page.",
  "- Keep the overall feeling cute, clean, soft, polished, and classic shonen-manga readable, not gritty, horror-styled, sketchy, or over-rendered.",
  "- Character model sheets are the highest visual authority and must be treated as exact identity locks, not inspiration. Match the uploaded model sheet for silhouette, face placement, eye spacing, highlight placement, line weight, body proportions, small feet, leg nubs, and point direction.",
  "- Every character has small rounded feet or foot nubs in full-body views. Never remove feet from any character. Sunny Spritz must keep small rounded feet under her star body.",
  "- In full-body shots, leave clear white space under each character's body so the small feet or foot nubs are visible; never crop the lower frame edge through the feet.",
  "- Feet and body must be visually connected as one continuous mascot form, matching the model sheets. Do not draw a hard horizontal outline, seam, shoe line, dividing stroke, or solid separating line between the body and feet.",
  "- For Sunny Spritz, draw two small rounded feet directly beneath the lower points of her soft five-point star body. Do not let the star points replace the feet, hide the feet, or crop the feet away.",
  "- Do not redesign Muci. Muci must stay a compact cute friendly teardrop mascot with a centered point, broad rounded base, large dot eyes, an open friendly smile, glossy highlight marks near the upper-left side, two small rounded feet at the bottom, and soft approachable protagonist energy.",
  "- Muci's proportions must stay squat and rounded like the model sheet, not tall or stretched: the full front-view body should feel broad and compact, with body height only about 1.2 to 1.35 times the body width. Avoid long narrow droplet proportions.",
  "- For any full-body Muci view, show the two small rounded feet exactly like the model sheet. Do not crop them away, hide them, replace them with a flat base, or remove them.",
  "- All characters in this world have no hands and no arms. Never draw arms, hands, fingers, paws, gloves, sleeves, wrists, elbows, or humanoid upper limbs on any character.",
  "- Preserve every character's small feet, lower body nubs, base shape, or tiny legs exactly as shown in each character's model sheet.",
  "- Mouth state lock: characters who are not actively speaking must have closed mouths, tiny neutral mouths, or quiet expression marks only. Open mouths are allowed only for the character currently speaking, shouting, gasping, singing, or making an explicit vocal sound in that panel.",
  "- Characters interact with nearby objects through gentle telekinesis. Show objects floating, tilting, sliding, or opening near them with small motion lines, glow cues, or manga emphasis marks instead of hands touching objects.",
  "- If a story beat mentions holding, pointing, grabbing, writing, pushing, opening, carrying, or handing something over, translate that action into telekinetic object movement while keeping every character handless.",
  "- Avoid adding extra characters, props, logos, product labels, watermarks, signatures, or random unrelated text. The only visible page text should be the specified dialogue, captions, SFX, signs, or labels from the prompt."
].join("\n");
const COMIC_LETTERING_STYLE_LOCKS = [
  "Comic lettering style locks:",
  "- Use one consistent lettering style across the whole comic: clean rounded manga hand-lettering, black ink on white balloons or white caption boxes.",
  "- Speech balloons must have simple white fill, crisp black outlines, consistent line weight, and clear tails pointing to the speaking character.",
  "- Keep dialogue text short enough to fit inside its balloon with generous padding. Do not shrink text unevenly, mix fonts, or use decorative type.",
  "- Captions and SFX must use the same clean manga lettering family, with SFX hand-drawn but still readable and consistent.",
  "- Do not invent extra visible text. Render only the exact dialogue, captions, SFX, signs, or labels named in the page prompt."
].join("\n");
const COMIC_CHINESE_NAME_LOCKS = [
  "Character Chinese name locks:",
  "- Muci = \u6155\u897f",
  "- Artrans = \u5b89\u5ddd\u897f",
  "- Nia = \u5c3c\u4e9a",
  "- Padaruna = \u556a\u55d2\u745e\u5a1c",
  "- Padarana = \u556a\u55d2\u5b89\u5a1c",
  "- Snacri = \u65af\u5948\u594e"
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
  profileMarkdown?: string | null;
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
  dialogueLines: GeneratedComicDialogueLine[];
};

export type GeneratedComicDialogueLine = {
  speaker: string;
  text: string;
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

export type PendingComicPromptPackage = {
  pending: true;
  responseId: string;
  status: string;
  message: string;
};

export type ReviseComicPagePromptInput = {
  episodeTitle: string;
  episodeSummary: string;
  pageNumber: number;
  pagePurpose: string;
  panelCount: number;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  globalGptImage2Notes: string | null;
  panels: Array<{
    panelNumber: number;
    panelTitle: string;
    storyBeat: string;
    promptText?: string;
    dialogueLines?: GeneratedComicDialogueLine[];
  }>;
  promptSuggestion: string;
};

export type RevisedComicPagePrompt = {
  pageNumber: number;
  panelCount: number;
  pagePurpose: string;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  panels: Array<{
    panelNumber: number;
    panelTitle: string;
    storyBeat: string;
    promptText: string;
    dialogueLines: GeneratedComicDialogueLine[];
  }>;
};

export type RevisedComicCharacterLock = {
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceNotes: string;
};

export type RevisedComicSceneLock = {
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceNotes: string;
};

export type ReviseComicCharacterLockInput = {
  name: string;
  slug: string;
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceNotes: string | null;
  referenceFiles?: ComicReferenceFileContext[];
  revisionInstruction: string;
};

export type ReviseComicSceneLockInput = {
  name: string;
  slug: string;
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceNotes: string | null;
  referenceFiles?: ComicReferenceFileContext[];
  revisionInstruction: string;
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
  referenceImages?: ComicReferenceImageFile[];
  characterLocks?: ComicCharacterIdentityLock[];
  generationAttempt?: number;
};

export type GeneratedComicPageImageAsset = {
  mimeType: string;
  base64Data: string;
};

export type ComicPageImageReferenceAsset = {
  mimeType: string;
  base64Data: string;
  fileName: string;
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

type ComicOutlineLevel = "PROJECT" | "SEASON" | "CHAPTER" | "EPISODE";

type ComicOutlineChainItem = {
  level: ComicOutlineLevel;
  title: string;
  summary?: string | null;
  outline: string;
};

type ComicOutlineChildContext = {
  label: string;
  title: string;
  summary?: string | null;
  outline?: string | null;
};

export type GeneratedChineseComicOutline = {
  summary: string;
  summaryEn: string;
  outline: string;
  outlineEn: string;
};

export type GeneratedChineseComicChildOutline = GeneratedChineseComicOutline & {
  id: string;
};

type TranslateChineseComicOutlineInput = {
  level: ComicOutlineLevel;
  title: string;
  summary?: string | null;
  outline: string;
  translationNotes?: string | null;
  characterNames?: string[];
};

type GenerateChineseComicOutlineInput = {
  level: ComicOutlineLevel;
  title: string;
  numberLabel?: string | null;
  existingSummary?: string | null;
  existingOutline?: string | null;
  revisionNotes?: string | null;
  parentChain?: ComicOutlineChainItem[];
  siblingOutlines?: ComicOutlineChildContext[];
  childTargets?: ComicOutlineChildContext[];
  characterNames?: string[];
  sceneNames?: string[];
  worldRules?: string | null;
  visualStyleGuide?: string | null;
};

type GenerateChineseComicChildOutlinesInput = {
  childLevel: Exclude<ComicOutlineLevel, "PROJECT">;
  parent: ComicOutlineChainItem;
  parentChain?: ComicOutlineChainItem[];
  children: Array<{
    id: string;
    title: string;
    numberLabel?: string | null;
    existingSummary?: string | null;
    existingOutline?: string | null;
    childTargets?: ComicOutlineChildContext[];
  }>;
  revisionNotes?: string | null;
  siblingContext?: ComicOutlineChildContext[];
  characterNames?: string[];
  sceneNames?: string[];
  worldRules?: string | null;
  visualStyleGuide?: string | null;
};

function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

function getOpenAiComicOutlineTimeoutMs() {
  const configuredSeconds = Number.parseInt(process.env.OPENAI_COMIC_OUTLINE_TIMEOUT_SECONDS || "", 10);

  if (!Number.isFinite(configuredSeconds) || configuredSeconds <= 0) {
    return DEFAULT_OPENAI_COMIC_OUTLINE_TIMEOUT_MS;
  }

  return Math.min(Math.max(configuredSeconds, 15), 55) * 1000;
}

function getOpenAiComicPromptTimeoutMs() {
  const configuredSeconds = Number.parseInt(process.env.OPENAI_COMIC_PROMPT_TIMEOUT_SECONDS || "", 10);

  if (!Number.isFinite(configuredSeconds) || configuredSeconds <= 0) {
    return DEFAULT_OPENAI_COMIC_PROMPT_TIMEOUT_MS;
  }

  return Math.min(Math.max(configuredSeconds, 15), 55) * 1000;
}

function getOpenAiComicImageTimeoutMs() {
  const configuredSeconds = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_TIMEOUT_SECONDS || "", 10);

  if (!Number.isFinite(configuredSeconds) || configuredSeconds <= 0) {
    return DEFAULT_OPENAI_COMIC_IMAGE_TIMEOUT_MS;
  }

  return Math.min(Math.max(configuredSeconds, 20), 55) * 1000;
}

function getOpenAiComicOutlineAbortSignal() {
  return AbortSignal.timeout(getOpenAiComicOutlineTimeoutMs());
}

function getOpenAiComicPromptAbortSignal() {
  return AbortSignal.timeout(getOpenAiComicPromptTimeoutMs());
}

function getOpenAiComicImageAbortSignal() {
  return AbortSignal.timeout(getOpenAiComicImageTimeoutMs());
}

function getOpenAiComicImageQuality(attempt = 1) {
  const configured = process.env.OPENAI_COMIC_IMAGE_QUALITY?.trim();

  if (configured) {
    return configured;
  }

  return attempt >= 2 ? "low" : "medium";
}

function getOpenAiComicImageOutputFormat() {
  const configured = (process.env.OPENAI_COMIC_IMAGE_OUTPUT_FORMAT || "webp").trim().toLowerCase();

  return ["png", "jpeg", "webp"].includes(configured) ? configured : "webp";
}

function getOpenAiComicImageOutputCompression() {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_OUTPUT_COMPRESSION || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 85;
  }

  return Math.min(Math.max(configured, 50), 100);
}

function getOpenAiComicImageMimeType(outputFormat: string) {
  if (outputFormat === "jpeg") {
    return "image/jpeg";
  }

  if (outputFormat === "webp") {
    return "image/webp";
  }

  return "image/png";
}

function getOpenAiComicImageInputFidelity(attempt = 1) {
  const imageModel = DEFAULT_OPENAI_COMIC_IMAGE_MODEL.trim().toLowerCase();

  if (imageModel === "gpt-image-2") {
    return "";
  }

  const configured = process.env.OPENAI_COMIC_IMAGE_INPUT_FIDELITY?.trim();

  if (configured) {
    return configured;
  }

  return attempt >= 2 ? "low" : "high";
}

function isOpenAiTimeoutError(error: unknown) {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name || "")
      : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    message.includes("aborted due to timeout") ||
    message.includes("operation was aborted")
  );
}

function shouldUseOpenAiComicPromptBackgroundMode() {
  return (process.env.OPENAI_COMIC_PROMPT_BACKGROUND || "true").trim().toLowerCase() !== "false";
}

function getOpenAiComicImageTimeoutMessage(label: string) {
  return `${label} timed out after ${Math.round(
    getOpenAiComicImageTimeoutMs() / 1000
  )} seconds. The image task can be retried automatically; if this keeps happening, lower OPENAI_COMIC_MAX_REFERENCE_IMAGES or OPENAI_COMIC_IMAGE_QUALITY.`;
}

async function fetchOpenAiComicImageResponse(
  url: string,
  init: RequestInit,
  label: string
) {
  try {
    return await fetch(url, {
      ...init,
      signal: getOpenAiComicImageAbortSignal()
    });
  } catch (error) {
    if (isOpenAiTimeoutError(error)) {
      throw new Error(getOpenAiComicImageTimeoutMessage(label));
    }

    throw error;
  }
}

async function fetchOpenAiComicOutlineResponse(apiKey: string, body: Record<string, unknown>) {
  try {
    return await fetch(`${OPENAI_API_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: getOpenAiComicOutlineAbortSignal(),
      body: JSON.stringify(body)
    });
  } catch (error) {
    if (isOpenAiTimeoutError(error)) {
      throw new Error(
        `OpenAI outline request timed out after ${Math.round(
          getOpenAiComicOutlineTimeoutMs() / 1000
        )} seconds. The task can be retried automatically; if it keeps timing out, use a smaller revision scope or set OPENAI_COMIC_OUTLINE_MODEL to a faster model.`
      );
    }

    throw error;
  }
}

function formatOutlineChain(chain: ComicOutlineChainItem[] = []) {
  if (chain.length === 0) {
    return "No parent outline is available for this level.";
  }

  return chain
    .map((item) =>
      [
        `${item.level}: ${item.title}`,
        item.summary ? `Summary: ${item.summary}` : null,
        `Outline:\n${item.outline}`
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n---\n\n");
}

function formatOutlineChildren(children: ComicOutlineChildContext[] = []) {
  if (children.length === 0) {
    return "No direct child records are available yet.";
  }

  return children
    .map((child) =>
      [
        `- ${child.label}: ${child.title}`,
        child.summary ? `  Existing summary: ${child.summary}` : null,
        child.outline ? `  Existing outline: ${child.outline}` : null
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
}

function formatOutlineNames(label: string, names: string[] = []) {
  return names.length > 0 ? `${label}: ${names.join(", ")}` : `${label}: None entered yet.`;
}

function getChineseOutlineSectionGuide(level: ComicOutlineLevel) {
  if (level === "PROJECT") {
    return [
      "## 核心设定",
      "## 整体主线",
      "## Season 推进",
      "## 角色弧光",
      "## 伏笔与禁区"
    ].join("\n");
  }

  if (level === "SEASON") {
    return [
      "## 本季目标",
      "## Chapter 流程",
      "## 角色推进",
      "## 关键伏笔",
      "## 季末钩子"
    ].join("\n");
  }

  if (level === "CHAPTER") {
    return [
      "## 本章目标",
      "## Episode 节奏",
      "## 场景与冲突",
      "## 角色变化",
      "## 结尾推进"
    ].join("\n");
  }

  return [
    "## 本集承诺",
    "## 核心剧情",
    "## 关键节拍",
    "## 连续性注意事项",
    "## Prompt 生成注意事项"
  ].join("\n");
}

function getChineseOutlineLengthLimits(level: ComicOutlineLevel) {
  if (level === "EPISODE") {
    return {
      summaryMaxLength: 360,
      outlineMaxLength: 3200
    };
  }

  if (level === "CHAPTER") {
    return {
      summaryMaxLength: 500,
      outlineMaxLength: 6500
    };
  }

  return {
    summaryMaxLength: 500,
    outlineMaxLength: 8000
  };
}

function getChineseOutlineLengthGuide(level: ComicOutlineLevel) {
  if (level === "EPISODE") {
    return "- For EPISODE, keep the output compact: 4-6 short Markdown sections, concrete beats only, no full parent recap, and no exhaustive prose.";
  }

  if (level === "CHAPTER") {
    return "- For CHAPTER, keep the outline scannable and focused on episode sequence, character movement, stakes, and continuity.";
  }

  return "- Keep the outline focused and scannable. Prefer concrete bullets over long paragraphs.";
}

function buildChineseOutlineSystemPrompt() {
  return [
    "You are Neatique's bilingual comic story architect.",
    "Write synchronized story outlines in Simplified Chinese and English.",
    "Keep every character name in English exactly as provided. Do not translate character names.",
    "Use existing English season, chapter, and episode titles as stable labels unless the user explicitly asks to change them.",
    "Use the parent outline as binding canon. Child outlines must inherit and refine the parent, not contradict it.",
    "Keep the output production-ready, concrete, and useful for later English image-prompt generation.",
    "Return only valid JSON matching the schema."
  ].join(" ");
}

function buildChineseOutlineUserPrompt(input: GenerateChineseComicOutlineInput) {
  return [
    `Target level: ${input.level}`,
    `Target title: ${input.title}`,
    input.numberLabel ? `Target number label: ${input.numberLabel}` : null,
    "",
    "Parent canon chain:",
    formatOutlineChain(input.parentChain),
    "",
    "Existing target content:",
    `Summary: ${input.existingSummary || "None"}`,
    `Outline:\n${input.existingOutline || "None"}`,
    "",
    "Sibling context:",
    formatOutlineChildren(input.siblingOutlines),
    "",
    "Direct child targets that this outline must prepare:",
    formatOutlineChildren(input.childTargets),
    "",
    formatOutlineNames("Locked character names", input.characterNames),
    formatOutlineNames("Reusable scene names", input.sceneNames),
    "",
    input.worldRules ? `World rules:\n${input.worldRules}` : "World rules: None entered.",
    "",
    input.visualStyleGuide
      ? `Visual style guide:\n${input.visualStyleGuide}`
      : "Visual style guide: None entered.",
    "",
    input.revisionNotes
      ? `User revision notes:\n${input.revisionNotes}`
      : "User revision notes: Generate or polish the bilingual outline.",
    "",
    "Required outline section shape:",
    getChineseOutlineSectionGuide(input.level),
    "",
    "Output requirements:",
    "- summary must be Simplified Chinese, concise, and suitable for a list view.",
    "- summaryEn must be a concise English companion summary with the same canon.",
    "- outline must be Markdown in Simplified Chinese.",
    "- outlineEn must be English Markdown with the same headings, beats, sequence, stakes, and continuity as outline.",
    "- Include concrete story beats, role movement, stakes, reveal timing, and continuity notes.",
    getChineseOutlineLengthGuide(input.level),
    "- Preserve English character names exactly.",
    "- Keep the Chinese and English versions synchronized. Do not add plot in one language that is missing from the other."
  ]
    .filter(Boolean)
    .join("\n");
}

function getSingleChineseOutlineSchema(level: ComicOutlineLevel) {
  const limits = getChineseOutlineLengthLimits(level);

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string", minLength: 20, maxLength: limits.summaryMaxLength },
      summaryEn: { type: "string", minLength: 20, maxLength: limits.summaryMaxLength },
      outline: { type: "string", minLength: 200, maxLength: limits.outlineMaxLength },
      outlineEn: { type: "string", minLength: 200, maxLength: limits.outlineMaxLength }
    },
    required: ["summary", "summaryEn", "outline", "outlineEn"]
  };
}

function buildChineseOutlineTranslationPrompt(input: TranslateChineseComicOutlineInput) {
  return [
    `Target level: ${input.level}`,
    `Target title: ${input.title}`,
    "",
    "Translate the existing comic outline into Simplified Chinese without changing the story.",
    "",
    "Existing summary:",
    input.summary || "None",
    "",
    "Existing outline:",
    input.outline,
    "",
    formatOutlineNames("Character names that must stay English", input.characterNames),
    "",
    input.translationNotes
      ? `User translation notes:\n${input.translationNotes}`
      : "User translation notes: Translate faithfully and preserve the existing content.",
    "",
    "Translation requirements:",
    "- Translate, do not regenerate.",
    "- summary and outline must be Simplified Chinese.",
    "- summaryEn and outlineEn must be faithful English companions for the same canon.",
    "- Preserve the same story facts, sequence, stakes, reveals, relationships, and episode/chapter/season structure.",
    "- Preserve Markdown headings, bullet structure, numbering, and emphasis where practical.",
    "- Keep English character names exactly as provided.",
    "- Keep model/tool terms such as Prompt, gpt-image-2, Season, Chapter, and Episode readable when they function as workflow labels.",
    "- Do not add new plot beats, remove existing beats, rename characters, or smooth over contradictions by inventing new canon.",
    "- The summary should be a faithful Chinese version of the existing summary, not a new pitch."
  ].join("\n");
}

async function requestChineseComicOutlineTranslation(
  input: TranslateChineseComicOutlineInput
): Promise<GeneratedChineseComicOutline> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  if (!input.outline.trim()) {
    throw new Error("No outline content is available to translate.");
  }

  const response = await fetchOpenAiComicOutlineResponse(apiKey, {
    model: DEFAULT_OPENAI_COMIC_OUTLINE_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are Neatique's conservative comic outline translator.",
              "Translate existing outlines into Simplified Chinese and return a faithful English companion without changing canon.",
              "Keep character names in English exactly as provided.",
              "Return only valid JSON matching the schema."
            ].join(" ")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildChineseOutlineTranslationPrompt(input)
          }
        ]
      }
    ],
    reasoning: {
      effort: OPENAI_COMIC_OUTLINE_REASONING_EFFORT
    },
    text: {
      format: {
        type: "json_schema",
        name: "translated_chinese_comic_outline",
        strict: true,
        schema: getSingleChineseOutlineSchema(input.level)
      }
    }
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI outline translation failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);
  const outline = outputText ? safeJsonParse(outputText) : null;
  const record = outline && typeof outline === "object" ? (outline as Record<string, unknown>) : null;

  if (
    !record ||
    typeof record.summary !== "string" ||
    typeof record.summaryEn !== "string" ||
    typeof record.outline !== "string" ||
    typeof record.outlineEn !== "string" ||
    !record.summary.trim() ||
    !record.summaryEn.trim() ||
    !record.outline.trim() ||
    !record.outlineEn.trim()
  ) {
    throw new Error("OpenAI did not return a valid translated Chinese comic outline.");
  }

  return {
    summary: record.summary.trim(),
    summaryEn: record.summaryEn.trim(),
    outline: record.outline.trim(),
    outlineEn: record.outlineEn.trim()
  };
}

function getChildChineseOutlineSchema(childLevel: Exclude<ComicOutlineLevel, "PROJECT">) {
  const limits = getChineseOutlineLengthLimits(childLevel);

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      outlines: {
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1, maxLength: 160 },
            summary: { type: "string", minLength: 20, maxLength: limits.summaryMaxLength },
            summaryEn: { type: "string", minLength: 20, maxLength: limits.summaryMaxLength },
            outline: { type: "string", minLength: 200, maxLength: limits.outlineMaxLength },
            outlineEn: { type: "string", minLength: 200, maxLength: limits.outlineMaxLength }
          },
          required: ["id", "summary", "summaryEn", "outline", "outlineEn"]
        }
      }
    },
    required: ["outlines"]
  };
}

async function requestChineseComicOutline(input: GenerateChineseComicOutlineInput) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await fetchOpenAiComicOutlineResponse(apiKey, {
    model: DEFAULT_OPENAI_COMIC_OUTLINE_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: buildChineseOutlineSystemPrompt()
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildChineseOutlineUserPrompt(input)
          }
        ]
      }
    ],
    reasoning: {
      effort: OPENAI_COMIC_OUTLINE_REASONING_EFFORT
    },
    text: {
      format: {
        type: "json_schema",
        name: "chinese_comic_outline",
        strict: true,
        schema: getSingleChineseOutlineSchema(input.level)
      }
    }
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI outline generation failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);
  const outline = outputText ? safeJsonParse(outputText) : null;
  const record = outline && typeof outline === "object" ? (outline as Record<string, unknown>) : null;

  if (
    !record ||
    typeof record.summary !== "string" ||
    typeof record.summaryEn !== "string" ||
    typeof record.outline !== "string" ||
    typeof record.outlineEn !== "string" ||
    !record.summary.trim() ||
    !record.summaryEn.trim() ||
    !record.outline.trim() ||
    !record.outlineEn.trim()
  ) {
    throw new Error("OpenAI did not return a valid Chinese comic outline.");
  }

  return {
    summary: record.summary.trim(),
    summaryEn: record.summaryEn.trim(),
    outline: record.outline.trim(),
    outlineEn: record.outlineEn.trim()
  };
}

function buildChineseChildOutlinesUserPrompt(input: GenerateChineseComicChildOutlinesInput) {
  const parentChain = [...(input.parentChain || []), input.parent];
  const childList = input.children
    .map((child) =>
      [
        `- id: ${child.id}`,
        `  title: ${child.title}`,
        child.numberLabel ? `  number label: ${child.numberLabel}` : null,
        child.existingSummary ? `  existing summary: ${child.existingSummary}` : null,
        child.existingOutline ? `  existing outline: ${child.existingOutline}` : null,
        child.childTargets?.length
          ? `  direct child targets:\n${formatOutlineChildren(child.childTargets)}`
          : null
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  return [
    `Generate bilingual Chinese and English outlines for every ${input.childLevel} below the parent.`,
    "",
    "Parent canon chain:",
    formatOutlineChain(parentChain),
    "",
    "Children to generate. Return exactly one outline object for each id:",
    childList,
    "",
    "Sibling context for pacing:",
    formatOutlineChildren(input.siblingContext),
    "",
    formatOutlineNames("Locked character names", input.characterNames),
    formatOutlineNames("Reusable scene names", input.sceneNames),
    "",
    input.worldRules ? `World rules:\n${input.worldRules}` : "World rules: None entered.",
    "",
    input.visualStyleGuide
      ? `Visual style guide:\n${input.visualStyleGuide}`
      : "Visual style guide: None entered.",
    "",
    input.revisionNotes
      ? `User revision notes:\n${input.revisionNotes}`
      : "User revision notes: Generate or polish the next-level bilingual outlines.",
    "",
    "Required outline section shape for every child:",
    getChineseOutlineSectionGuide(input.childLevel),
    "",
    "Output requirements:",
    "- Return exactly the ids given above, with no missing or invented ids.",
    "- summary and outline must be Simplified Chinese.",
    "- summaryEn and outlineEn must be faithful English companion versions of the same canon.",
    "- Keep English character names exactly.",
    "- Make siblings distinct, sequential, and compatible with the parent outline.",
    getChineseOutlineLengthGuide(input.childLevel),
    "- Do not write final image prompts here; Episode prompts are generated later in English."
  ]
    .filter(Boolean)
    .join("\n");
}

async function requestChineseComicChildOutlines(input: GenerateChineseComicChildOutlinesInput) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  if (input.children.length === 0) {
    return [];
  }

  const response = await fetchOpenAiComicOutlineResponse(apiKey, {
    model: DEFAULT_OPENAI_COMIC_OUTLINE_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: buildChineseOutlineSystemPrompt()
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildChineseChildOutlinesUserPrompt(input)
          }
        ]
      }
    ],
    reasoning: {
      effort: OPENAI_COMIC_OUTLINE_REASONING_EFFORT
    },
    text: {
      format: {
        type: "json_schema",
        name: "chinese_comic_child_outlines",
        strict: true,
        schema: getChildChineseOutlineSchema(input.childLevel)
      }
    }
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI child outline generation failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);
  const payload = outputText ? safeJsonParse(outputText) : null;
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const outlines = Array.isArray(record?.outlines) ? record.outlines : [];
  const expectedIds = new Set(input.children.map((child) => child.id));
  const normalized = outlines
    .map((outline) => {
      const item = outline && typeof outline === "object" ? (outline as Record<string, unknown>) : null;

      return {
        id: typeof item?.id === "string" ? item.id.trim() : "",
        summary: typeof item?.summary === "string" ? item.summary.trim() : "",
        summaryEn: typeof item?.summaryEn === "string" ? item.summaryEn.trim() : "",
        outline: typeof item?.outline === "string" ? item.outline.trim() : "",
        outlineEn: typeof item?.outlineEn === "string" ? item.outlineEn.trim() : ""
      };
    })
    .filter(
      (outline) =>
        expectedIds.has(outline.id) &&
        outline.summary &&
        outline.summaryEn &&
        outline.outline &&
        outline.outlineEn
    );
  const returnedIds = new Set(normalized.map((outline) => outline.id));

  if (input.children.some((child) => !returnedIds.has(child.id))) {
    throw new Error("OpenAI did not return an outline for every requested child record.");
  }

  return normalized;
}

export async function generateChineseComicOutlineWithAi(
  input: GenerateChineseComicOutlineInput
): Promise<GeneratedChineseComicOutline> {
  return requestChineseComicOutline(input);
}

export async function translateChineseComicOutlineWithAi(
  input: TranslateChineseComicOutlineInput
): Promise<GeneratedChineseComicOutline> {
  return requestChineseComicOutlineTranslation(input);
}

export async function generateChineseComicChildOutlinesWithAi(
  input: GenerateChineseComicChildOutlinesInput
): Promise<GeneratedChineseComicChildOutline[]> {
  return requestChineseComicChildOutlines(input);
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

function formatComicReferenceFileContext(files: ComicReferenceFileContext[] = []) {
  if (files.length === 0) {
    return "No uploaded reference images are listed yet.";
  }

  return files
    .map((file) => `- ${file.label}: ${file.relativePath}`)
    .join("\n");
}

function buildComicLockRevisionSystemPrompt() {
  return [
    "You are Neatique's comic continuity editor.",
    "Rewrite lock documents conservatively so character and scene consistency improves without changing canon.",
    "Write admin-facing lock content in Simplified Chinese, but keep every character name, slug, image filename, and important existing English visual term exactly when needed.",
    "Make visual differences concrete, inspectable, and non-negotiable. Avoid vague style words.",
    "Return only valid JSON matching the requested schema."
  ].join(" ");
}

function buildCharacterLockRevisionPrompt(input: ReviseComicCharacterLockInput) {
  return [
    `Character name: ${input.name}`,
    `Character slug: ${input.slug}`,
    "",
    "Current lock:",
    `Role: ${input.role}`,
    `Appearance:\n${input.appearance}`,
    `Personality:\n${input.personality}`,
    `Speech guide:\n${input.speechGuide}`,
    `Reference notes:\n${input.referenceNotes || "None"}`,
    "",
    "Uploaded reference images:",
    formatComicReferenceFileContext(input.referenceFiles),
    "",
    "User modification request:",
    input.revisionInstruction,
    "",
    "Revision requirements:",
    "- Keep the same character identity and English name.",
    "- Strengthen silhouette, face placement, proportions, distinctive marks, body details, expression rules, and what must never change.",
    "- If uploaded images exist, explicitly tell future prompts to treat them as exact model-sheet identity locks.",
    "- Do not invent a new backstory unless the request asks for it.",
    "- Preserve useful existing details and only revise what the request targets.",
    "- role should stay short. appearance, personality, speechGuide, and referenceNotes should be production-ready lock text."
  ].join("\n");
}

function buildSceneLockRevisionPrompt(input: ReviseComicSceneLockInput) {
  return [
    `Scene name: ${input.name}`,
    `Scene slug: ${input.slug}`,
    "",
    "Current lock:",
    `Summary:\n${input.summary}`,
    `Visual notes:\n${input.visualNotes}`,
    `Mood notes:\n${input.moodNotes}`,
    `Reference notes:\n${input.referenceNotes || "None"}`,
    "",
    "Uploaded reference images:",
    formatComicReferenceFileContext(input.referenceFiles),
    "",
    "User modification request:",
    input.revisionInstruction,
    "",
    "Revision requirements:",
    "- Keep the same reusable location identity.",
    "- Strengthen layout, anchor props, camera-safe landmarks, lighting states, mood rules, scale, and continuity details.",
    "- If uploaded images exist, explicitly tell future prompts to treat them as exact environment references.",
    "- Preserve useful existing details and only revise what the request targets.",
    "- summary should be concise. visualNotes, moodNotes, and referenceNotes should be production-ready lock text."
  ].join("\n");
}

function getCharacterLockRevisionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      role: { type: "string", minLength: 1, maxLength: 160 },
      appearance: { type: "string", minLength: 80, maxLength: 5000 },
      personality: { type: "string", minLength: 40, maxLength: 3000 },
      speechGuide: { type: "string", minLength: 40, maxLength: 3000 },
      referenceNotes: { type: "string", minLength: 20, maxLength: 3000 }
    },
    required: ["role", "appearance", "personality", "speechGuide", "referenceNotes"]
  };
}

function getSceneLockRevisionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string", minLength: 40, maxLength: 1000 },
      visualNotes: { type: "string", minLength: 80, maxLength: 5000 },
      moodNotes: { type: "string", minLength: 40, maxLength: 3000 },
      referenceNotes: { type: "string", minLength: 20, maxLength: 3000 }
    },
    required: ["summary", "visualNotes", "moodNotes", "referenceNotes"]
  };
}

async function requestComicLockRevision<T>(input: {
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  errorMessage: string;
  validate: (record: Record<string, unknown>) => T | null;
}) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

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
              text: buildComicLockRevisionSystemPrompt()
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: input.userPrompt
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
          name: input.schemaName,
          strict: true,
          schema: input.schema
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
        : null) || `OpenAI lock revision failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);
  const payload = outputText ? safeJsonParse(outputText) : null;
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const revised = record ? input.validate(record) : null;

  if (!revised) {
    throw new Error(input.errorMessage);
  }

  return revised;
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function reviseComicCharacterLockWithAi(
  input: ReviseComicCharacterLockInput
): Promise<RevisedComicCharacterLock> {
  return requestComicLockRevision<RevisedComicCharacterLock>({
    userPrompt: buildCharacterLockRevisionPrompt(input),
    schemaName: "comic_character_lock_revision",
    schema: getCharacterLockRevisionSchema(),
    errorMessage: "OpenAI did not return a valid character lock revision.",
    validate: (record) => {
      const revised = {
        role: requiredString(record, "role"),
        appearance: requiredString(record, "appearance"),
        personality: requiredString(record, "personality"),
        speechGuide: requiredString(record, "speechGuide"),
        referenceNotes: requiredString(record, "referenceNotes")
      };

      return Object.values(revised).every(Boolean) ? revised : null;
    }
  });
}

export async function reviseComicSceneLockWithAi(
  input: ReviseComicSceneLockInput
): Promise<RevisedComicSceneLock> {
  return requestComicLockRevision<RevisedComicSceneLock>({
    userPrompt: buildSceneLockRevisionPrompt(input),
    schemaName: "comic_scene_lock_revision",
    schema: getSceneLockRevisionSchema(),
    errorMessage: "OpenAI did not return a valid scene lock revision.",
    validate: (record) => {
      const revised = {
        summary: requiredString(record, "summary"),
        visualNotes: requiredString(record, "visualNotes"),
        moodNotes: requiredString(record, "moodNotes"),
        referenceNotes: requiredString(record, "referenceNotes")
      };

      return Object.values(revised).every(Boolean) ? revised : null;
    }
  });
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

function parseImageBase64Response(
  value: string,
  fallbackMimeType = "image/png"
): GeneratedComicPageImageAsset {
  const dataUrlMatch = value.match(/^data:([^;]+);base64,([\s\S]+)$/);

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1] || "image/png",
      base64Data: dataUrlMatch[2].trim()
    };
  }

  return {
    mimeType: fallbackMimeType,
    base64Data: value
  };
}

async function fetchImageUrlAsBase64(url: string): Promise<GeneratedComicPageImageAsset> {
  const response = await fetchOpenAiComicImageResponse(
    url,
    {},
    "Comic image result download"
  );

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
          `  Appearance: ${trimPromptContext(character.appearance, 900)}`,
          `  Personality: ${trimPromptContext(character.personality, 520)}`,
          `  Speech guide: ${trimPromptContext(character.speechGuide, 520)}`,
          `  Reference folder: ${character.referenceFolder}`,
          `  Reference notes: ${trimPromptContext(character.referenceNotes || "None", 420)}`,
          character.profileMarkdown
            ? `  Canon profile MD:\n${trimPromptContext(character.profileMarkdown, 1400)}`
            : "  Canon profile MD: Not available.",
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
          `  Summary: ${trimPromptContext(scene.summary, 420)}`,
          `  Visual notes: ${trimPromptContext(scene.visualNotes, 900)}`,
          `  Mood notes: ${trimPromptContext(scene.moodNotes, 420)}`,
          `  Reference folder: ${scene.referenceFolder}`,
          `  Reference notes: ${trimPromptContext(scene.referenceNotes || "None", 420)}`,
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

function trimPromptContext(value: string | null | undefined, maxLength: number) {
  const normalized = (value || "").trim();

  if (!normalized || normalized.length <= maxLength) {
    return normalized || "None";
  }

  return `${normalized.slice(0, maxLength).trimEnd()}\n[Context trimmed for prompt package speed.]`;
}

function buildComicPageUploadSummary(uploads: GeneratedComicPageUpload[]) {
  if (uploads.length === 0) {
    return "No required reference uploads were listed for this page.";
  }

  return uploads
    .map((upload) =>
      [
        `- ${upload.label} (${upload.bucket})`,
        `  Why it matters: ${trimPromptContext(upload.whyThisMatters, 220)}`,
        `  Visual lock: ${trimPromptContext(upload.contentSummary, 260)}`,
        `  Upload image names: ${upload.uploadImageNames.join(", ") || "None listed"}`,
        `  Workspace paths: ${upload.relativePaths.join(", ") || "None listed"}`
      ].join("\n")
    )
    .join("\n\n");
}

function buildComicPageReferenceImageSummary(referenceImages: ComicReferenceImageFile[] = []) {
  if (referenceImages.length === 0) {
    return "No actual reference images were attached to this request.";
  }

  return referenceImages
    .map((reference, index) =>
      [
        `${index + 1}. ${reference.label}`,
        `   File: ${reference.fileName}`,
        `   Path: ${reference.relativePath}`,
        `   Type: ${reference.bucket}`,
        `   Why it matters: ${trimPromptContext(reference.whyThisMatters, 220)}`,
        `   Visual lock: ${trimPromptContext(reference.contentSummary, 260)}`
      ].join("\n")
    )
    .join("\n\n");
}

function buildComicPageCharacterIdentityLockSummary(
  characterLocks: ComicCharacterIdentityLock[] = []
) {
  if (characterLocks.length === 0) {
    return "No character profile MD locks were loaded for this page.";
  }

  return characterLocks
    .map((character) =>
      [
        `${character.name} (${character.slug})`,
        `Role: ${character.role}`,
        `Appearance lock from database: ${trimPromptContext(character.appearance, 1000)}`,
        `Personality lock: ${trimPromptContext(character.personality, 520)}`,
        character.referenceNotes
          ? `Reference notes: ${trimPromptContext(character.referenceNotes, 520)}`
          : null,
        character.profileMarkdown
          ? `Profile MD source of truth:\n${trimPromptContext(character.profileMarkdown, 1800)}`
          : "Profile MD source of truth: not available.",
        `Reference image files: ${
          character.referenceFiles.map((file) => file.fileName).join(", ") || "None"
        }`
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n---\n\n");
}

function normalizeComicDialogueLines(value: unknown): GeneratedComicDialogueLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((line) => ({
      speaker:
        line && typeof line === "object" && typeof (line as any).speaker === "string"
          ? (line as any).speaker.trim()
          : "",
      text:
        line && typeof line === "object" && typeof (line as any).text === "string"
          ? (line as any).text.trim()
          : ""
    }))
    .filter((line) => line.speaker && line.text)
    .slice(0, 4);
}

function formatComicDialogueLines(lines: GeneratedComicDialogueLine[]) {
  if (lines.length === 0) {
    return "No dialogue lines specified.";
  }

  return lines.map((line) => `${line.speaker}: "${line.text}"`).join("\n");
}

function buildComicPageDialoguePlan(panels: GeneratedComicPanelPrompt[]) {
  const panelBlocks = panels.map((panel) =>
    [
      `Panel ${panel.panelNumber}: ${panel.panelTitle}`,
      formatComicDialogueLines(panel.dialogueLines || [])
    ].join("\n")
  );

  return panelBlocks.join("\n\n");
}

function promptIncludesDialogue(prompt: string, panels: GeneratedComicPanelPrompt[]) {
  const normalizedPrompt = prompt.toLowerCase();
  const dialogueLines = panels.flatMap((panel) => panel.dialogueLines || []);

  return (
    dialogueLines.length > 0 &&
    dialogueLines.every((line) => normalizedPrompt.includes(line.text.toLowerCase()))
  );
}

function ensurePromptIncludesDialogueAndLettering(
  prompt: string,
  panels: GeneratedComicPanelPrompt[]
) {
  const additions: string[] = [];

  if (!promptIncludesDialogue(prompt, panels)) {
    additions.push(`Dialogue and lettering plan:\n${buildComicPageDialoguePlan(panels)}`);
  }

  if (!/lettering|speech balloon|speech balloons|caption/i.test(prompt)) {
    additions.push(COMIC_LETTERING_STYLE_LOCKS);
  }

  return additions.length > 0 ? `${prompt.trim()}\n\n${additions.join("\n\n")}` : prompt.trim();
}

function getComicPageImageAttemptGuide(input: GenerateComicPageImageInput) {
  const attempt = Math.max(input.generationAttempt || 1, 1);

  if (attempt >= 3) {
    return [
      "Character-reference priority retry mode:",
      "- The attached character model sheets remain mandatory identity locks. Do not generate this page without character references.",
      "- Keep the composition simpler and avoid nonessential background detail, but preserve every character silhouette, face placement, body fill, and feet exactly.",
      "- Prefer fewer, larger, cleaner drawings over complex crowding so the reference-guided edit can finish reliably."
    ].join("\n");
  }

  if (attempt === 2) {
    return [
      "Fast reference mode:",
      "- Use the attached model sheets as strict identity references while keeping the page composition simpler.",
      "- Avoid overly detailed backgrounds or crowding if they slow generation or risk identity drift."
    ].join("\n");
  }

  return "Primary reference mode: use the attached model sheets and scene references as strict identity and continuity locks.";
}

function isComicCharacterReferenceImage(reference: ComicReferenceImageFile) {
  return reference.bucket === "CHARACTER" || reference.bucket === "DETECTED_CHARACTER";
}

function getOpenAiComicImageReferenceLimit() {
  const maxReferenceImages = Number.parseInt(process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES || "", 10);

  return Number.isFinite(maxReferenceImages) && maxReferenceImages > 0
    ? Math.min(Math.max(maxReferenceImages, 4), 16)
    : 8;
}

function selectComicPageImageReferenceImages(
  references: ComicReferenceImageFile[],
  attempt: number
) {
  const referenceLimit = getOpenAiComicImageReferenceLimit();

  if (attempt <= 1) {
    return references.slice(0, referenceLimit);
  }

  const characterReferences = references.filter(isComicCharacterReferenceImage);
  const nonCharacterReferences = references.filter((reference) => !isComicCharacterReferenceImage(reference));

  if (characterReferences.length > 0) {
    const selected = characterReferences.slice(0, referenceLimit);

    if (attempt === 2 && selected.length < referenceLimit) {
      selected.push(...nonCharacterReferences.slice(0, referenceLimit - selected.length));
    }

    return selected;
  }

  return references.slice(0, Math.min(referenceLimit, 2));
}

function ensureReferenceNotesIncludeLettering(notes: string) {
  return /lettering|speech balloon|speech balloons|caption/i.test(notes)
    ? notes.trim()
    : `${notes.trim()}\n\n${COMIC_LETTERING_STYLE_LOCKS}`;
}

function getOpenAiResponseId(response: unknown) {
  return response && typeof response === "object" && "id" in response
    ? String((response as { id?: unknown }).id || "")
    : "";
}

function getOpenAiResponseStatus(response: unknown) {
  return response && typeof response === "object" && "status" in response
    ? String((response as { status?: unknown }).status || "")
    : "";
}

function getOpenAiResponseFailureMessage(response: unknown) {
  const record = response && typeof response === "object" ? (response as Record<string, unknown>) : null;

  if (!record) {
    return "";
  }

  const errorMessage = "error" in record ? extractOpenAiErrorMessage(record.error) : null;

  if (errorMessage) {
    return errorMessage;
  }

  const incompleteDetails =
    record.incomplete_details && typeof record.incomplete_details === "object"
      ? (record.incomplete_details as Record<string, unknown>)
      : null;
  const reason =
    typeof incompleteDetails?.reason === "string" ? incompleteDetails.reason : getOpenAiResponseStatus(record);

  return reason ? `OpenAI response ended with status: ${reason}.` : "";
}

function getPendingComicPromptPackage(response: unknown): PendingComicPromptPackage | null {
  const status = getOpenAiResponseStatus(response);

  if (!["queued", "in_progress"].includes(status)) {
    return null;
  }

  const responseId = getOpenAiResponseId(response);

  if (!responseId) {
    throw new Error("OpenAI prompt package response is pending but did not include a response id.");
  }

  return {
    pending: true,
    responseId,
    status,
    message:
      status === "queued"
        ? "OpenAI is preparing this 10-page prompt package."
        : "OpenAI is still generating this 10-page prompt package."
  };
}

function assertOpenAiPromptPackageIsComplete(response: unknown) {
  const status = getOpenAiResponseStatus(response);

  if (["failed", "cancelled", "incomplete", "expired"].includes(status)) {
    throw new Error(getOpenAiResponseFailureMessage(response) || `OpenAI response ${status}.`);
  }
}

async function readOpenAiJsonResponse(response: Response, fallbackMessage: string) {
  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `${fallbackMessage} ${response.status}.`;
    throw new Error(message);
  }

  return parsed;
}

async function createOpenAiComicPromptPackageResponse(
  apiKey: string,
  body: Record<string, unknown>
) {
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: getOpenAiComicPromptAbortSignal(),
      body: JSON.stringify(body)
    });

    return readOpenAiJsonResponse(response, "OpenAI prompt package request failed with");
  } catch (error) {
    if (isOpenAiTimeoutError(error)) {
      throw new Error(
        `OpenAI prompt package request timed out after ${Math.round(
          getOpenAiComicPromptTimeoutMs() / 1000
        )} seconds. The task can be retried automatically.`
      );
    }

    throw error;
  }
}

async function retrieveOpenAiComicPromptPackageResponse(apiKey: string, responseId: string) {
  try {
    const response = await fetch(
      `${OPENAI_API_BASE_URL}/responses/${encodeURIComponent(responseId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        signal: getOpenAiComicPromptAbortSignal()
      }
    );

    return readOpenAiJsonResponse(response, "OpenAI prompt package retrieval failed with");
  } catch (error) {
    if (isOpenAiTimeoutError(error)) {
      throw new Error(
        `OpenAI prompt package status check timed out after ${Math.round(
          getOpenAiComicPromptTimeoutMs() / 1000
        )} seconds. The task can be retried automatically.`
      );
    }

    throw error;
  }
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
        `Dialogue lines:\n${formatComicDialogueLines(panel.dialogueLines || [])}`,
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
    "- The actual reference images attached to this API request are binding visual references. Copy their silhouettes, proportions, face placement, highlight placement, body fill, and feet exactly where those characters or scenes appear.",
    "- Treat each character's Profile MD lock and attached model-sheet image as a paired identity contract: the MD tells you what details must stay distinct, and the image tells you the exact shape to draw.",
    "- Only draw the characters named in the panel plan or dialogue for this page. Do not add background mascots just because their references are available.",
    "- When multiple mascot characters appear, compare their Profile MD locks before drawing. Do not blend silhouettes, faces, highlights, feet, expressions, or body proportions across characters.",
    "- Foot visibility check: any full-body character must show small rounded feet or foot nubs with clear space below the body; do not crop off feet.",
    "- Foot connection check: feet must connect naturally to the body with the same continuous white body fill; do not add a hard separating line between the feet and body.",
    "- Sunny Spritz check: if Sunny appears full-body, her two small rounded feet must be visible directly under the soft five-point star body.",
    "- Mouth state check: draw closed mouths for characters who are not speaking in that panel; only the active speaker or explicit vocal reaction may have an open mouth.",
    "- Render every specified dialogue line, caption, and SFX from the panel plan. Do not omit dialogue balloons.",
    COMIC_LETTERING_STYLE_LOCKS,
    "",
    getComicPageImageAttemptGuide(input),
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
    "Actual reference images attached to this image API call:",
    buildComicPageReferenceImageSummary(input.referenceImages),
    "",
    "Character Profile MD identity locks loaded for this page:",
    buildComicPageCharacterIdentityLockSummary(input.characterLocks),
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

  const attempt = Math.max(input.generationAttempt || 1, 1);
  const referenceImages = selectComicPageImageReferenceImages(input.referenceImages || [], attempt);
  const imageQuality = getOpenAiComicImageQuality(attempt);
  const outputFormat = getOpenAiComicImageOutputFormat();
  const outputMimeType = getOpenAiComicImageMimeType(outputFormat);
  const outputCompression = getOpenAiComicImageOutputCompression();
  const prompt = buildComicPageImagePrompt({
    ...input,
    referenceImages
  });

  if (referenceImages.length === 0) {
    throw new Error(
      "No comic reference images were loaded for this page. Regenerate the page prompt or fix the character reference checklist before running image generation."
    );
  }

  const formData = new FormData();
  formData.append("model", DEFAULT_OPENAI_COMIC_IMAGE_MODEL);
  formData.append("prompt", prompt);
  formData.append("size", "1024x1536");
  formData.append("quality", imageQuality);
  formData.append("output_format", outputFormat);
  if (outputFormat !== "png") {
    formData.append("output_compression", String(outputCompression));
  }
  formData.append("n", "1");

  const inputFidelity = getOpenAiComicImageInputFidelity(attempt);
  if (inputFidelity) {
    formData.append("input_fidelity", inputFidelity);
  }

  for (const referenceImage of referenceImages) {
    const blob = new Blob([new Uint8Array(referenceImage.data)], {
      type: referenceImage.mimeType
    });
    formData.append("image[]", blob, referenceImage.fileName);
  }

  const response = await fetchOpenAiComicImageResponse(
    `${imageApiSettings.baseUrl}/images/edits`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageApiSettings.apiKey}`
      },
      body: formData
    },
    "OpenAI comic page image reference edit"
  );

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI comic page image reference edit failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";
  const imageUrl = typeof data?.[0]?.url === "string" ? data[0].url.trim() : "";

  if (!base64Data) {
    if (imageUrl) {
      return fetchImageUrlAsBase64(imageUrl);
    }

    throw new Error("Comic image API did not return a reference-guided comic page image.");
  }

  return parseImageBase64Response(base64Data, outputMimeType);
}

export async function generateChineseComicPageVersionWithAi(input: {
  sourceImage: ComicPageImageReferenceAsset;
  pageNumber: number;
  episodeTitle: string;
}): Promise<GeneratedComicPageImageAsset> {
  const imageApiSettings = getComicImageApiSettings();

  if (!imageApiSettings.apiKey) {
    throw new Error("Comic image API key is not configured.");
  }

  const formData = new FormData();
  const sourceBuffer = Buffer.from(input.sourceImage.base64Data, "base64");
  formData.append("model", DEFAULT_OPENAI_COMIC_IMAGE_MODEL);
  formData.append(
    "prompt",
    [
      "Create a Simplified Chinese version of the supplied approved comic page.",
      "Edit only the visible text on the page. Translate speech balloons, captions, signs, labels, and small readable English page text into natural Simplified Chinese.",
      "Keep the page art, panel layout, camera angles, character poses, character proportions, facial expressions, linework, gutters, page size, and composition unchanged.",
      "Do not redraw or redesign any character. Preserve the clean black-and-white manga style, pure white mascot body fills, and crisp black ink linework.",
      "Keep text short enough to fit the original balloon or sign areas. Use clean readable Chinese lettering.",
      "Use these required character names exactly when names appear:",
      COMIC_CHINESE_NAME_LOCKS,
      "Do not add new English text, watermarks, logos, signatures, extra panels, or extra characters.",
      `Episode: ${input.episodeTitle}`,
      `Page: ${input.pageNumber}`
    ].join("\n")
  );
  formData.append("size", "1024x1536");
  formData.append("quality", getOpenAiComicImageQuality());
  const outputFormat = getOpenAiComicImageOutputFormat();
  formData.append("output_format", outputFormat);
  if (outputFormat !== "png") {
    formData.append("output_compression", String(getOpenAiComicImageOutputCompression()));
  }
  formData.append(
    "image",
    new Blob([new Uint8Array(sourceBuffer)], { type: input.sourceImage.mimeType }),
    input.sourceImage.fileName
  );

  const response = await fetchOpenAiComicImageResponse(
    `${imageApiSettings.baseUrl}/images/edits`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageApiSettings.apiKey}`
      },
      body: formData
    },
    "OpenAI Chinese comic page image edit"
  );

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `Comic Chinese page creation failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";
  const imageUrl = typeof data?.[0]?.url === "string" ? data[0].url.trim() : "";

  if (!base64Data) {
    if (imageUrl) {
      return fetchImageUrlAsBase64(imageUrl);
    }

    throw new Error("Comic image API did not return a Chinese comic page image.");
  }

  return parseImageBase64Response(base64Data, getOpenAiComicImageMimeType(getOpenAiComicImageOutputFormat()));
}

export async function editComicPageImageWithAi(input: {
  sourceImage: ComicPageImageReferenceAsset;
  pageNumber: number;
  episodeTitle: string;
  editInstruction: string;
}): Promise<GeneratedComicPageImageAsset> {
  const imageApiSettings = getComicImageApiSettings();

  if (!imageApiSettings.apiKey) {
    throw new Error("Comic image API key is not configured.");
  }

  const editInstruction = input.editInstruction.trim();

  if (!editInstruction) {
    throw new Error("Comic page edit instruction is required.");
  }

  const formData = new FormData();
  const sourceBuffer = Buffer.from(input.sourceImage.base64Data, "base64");
  formData.append("model", DEFAULT_OPENAI_COMIC_IMAGE_MODEL);
  formData.append(
    "prompt",
    [
      "Edit the supplied finished comic page using it as the primary reference image.",
      "The following global comic production locks remain mandatory during edits. They override any accidental drift in the source image or edit request:",
      COMIC_VISUAL_PRODUCTION_LOCKS,
      "",
      "Edit-specific constraints:",
      "Make only the requested local/simple change. Preserve the existing page as much as possible.",
      "Keep the same panel layout, page size, camera angles, composition, gutters, character identities, character proportions, facial expressions, clean black-and-white manga linework, pure white mascot body fills, and readable page rhythm.",
      "Do not regenerate the page from scratch. Do not add new panels, extra characters, random props, watermarks, signatures, logos, or unrelated text.",
      "Keep all characters handless and armless. Preserve visible small rounded feet or foot nubs in any full-body character view. Do not crop, flatten, hide, remove, or separate the feet from the body with hard dividing lines while editing.",
      "Do not elongate Muci or any mascot body. Keep the same cute, compact, model-sheet proportions and pure white body fill.",
      "If the edit request affects text, keep the wording short and fitted to the original balloon/sign space.",
      "If the edit request conflicts with the locked comic style or character model consistency, make the closest safe edit while preserving the original character/page identity.",
      `Episode: ${input.episodeTitle}`,
      `Page: ${input.pageNumber}`,
      "",
      "Admin edit request:",
      editInstruction
    ].join("\n")
  );
  formData.append("size", "1024x1536");
  formData.append("quality", getOpenAiComicImageQuality());
  const outputFormat = getOpenAiComicImageOutputFormat();
  formData.append("output_format", outputFormat);
  if (outputFormat !== "png") {
    formData.append("output_compression", String(getOpenAiComicImageOutputCompression()));
  }
  formData.append(
    "image",
    new Blob([new Uint8Array(sourceBuffer)], { type: input.sourceImage.mimeType }),
    input.sourceImage.fileName
  );

  const response = await fetchOpenAiComicImageResponse(
    `${imageApiSettings.baseUrl}/images/edits`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageApiSettings.apiKey}`
      },
      body: formData
    },
    "OpenAI comic page image edit"
  );

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `Comic page image edit failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";
  const imageUrl = typeof data?.[0]?.url === "string" ? data[0].url.trim() : "";

  if (!base64Data) {
    if (imageUrl) {
      return fetchImageUrlAsBase64(imageUrl);
    }

    throw new Error("Comic image API did not return an edited comic page image.");
  }

  return parseImageBase64Response(base64Data, getOpenAiComicImageMimeType(getOpenAiComicImageOutputFormat()));
}

export async function reviseComicPagePromptWithAi(
  input: ReviseComicPagePromptInput
): Promise<RevisedComicPagePrompt> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      pageNumber: { type: "integer", minimum: input.pageNumber, maximum: input.pageNumber },
      panelCount: { type: "integer", enum: [2, 3] },
      pagePurpose: { type: "string", minLength: 12, maxLength: 520 },
      promptPackCopyText: { type: "string", minLength: 180, maxLength: 12000 },
      referenceNotesCopyText: { type: "string", minLength: 120, maxLength: 8000 },
      panels: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            panelNumber: { type: "integer", minimum: 1, maximum: 3 },
            panelTitle: { type: "string", minLength: 4, maxLength: 140 },
            storyBeat: { type: "string", minLength: 12, maxLength: 900 },
            promptText: { type: "string", minLength: 60, maxLength: 1400 },
            dialogueLines: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  speaker: { type: "string", minLength: 2, maxLength: 80 },
                  text: { type: "string", minLength: 1, maxLength: 160 }
                },
                required: ["speaker", "text"]
              }
            }
          },
          required: ["panelNumber", "panelTitle", "storyBeat", "promptText", "dialogueLines"]
        }
      }
    },
    required: [
      "pageNumber",
      "panelCount",
      "pagePurpose",
      "promptPackCopyText",
      "referenceNotesCopyText",
      "panels"
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
                "You revise one Neatique comic page prompt for image generation.",
                "Use the user's prompt suggestion, which may be in Chinese or English, as the requested creative direction.",
                "Return only valid JSON matching the schema.",
                "Revise only this one page. Keep the page number fixed.",
                "Keep the page production-ready for gpt-image-2.",
                "Do not shorten, summarize, or truncate the existing page prompt. The revised prompt must stay complete enough to generate the whole page.",
                "Preserve the existing story continuity unless the suggestion explicitly asks for a composition change.",
                "Do not remove required character or scene continuity details.",
                "Every revised panel must include dialogueLines with exact visible dialogue text, plus promptText that explains where balloons/captions/SFX go.",
                "The revised promptPackCopyText must include a Dialogue and lettering plan section with every dialogue line exactly as it should appear on the page.",
                "All revised prompt text must enforce these production locks:",
                COMIC_VISUAL_PRODUCTION_LOCKS,
                COMIC_LETTERING_STYLE_LOCKS,
                "All characters have small rounded feet or foot nubs in full-body views. Full-body framing must leave the feet visible. Feet must connect naturally to the body without hard separating lines. Sunny Spritz must keep two small rounded feet directly under her soft five-point star body."
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Episode context:",
                `Title: ${input.episodeTitle}`,
                `Summary: ${input.episodeSummary || "No summary stored."}`,
                "",
                "Current page:",
                JSON.stringify(
                  {
                    pageNumber: input.pageNumber,
                    panelCount: input.panelCount,
                    pagePurpose: input.pagePurpose,
                    promptPackCopyText: input.promptPackCopyText,
                    referenceNotesCopyText: input.referenceNotesCopyText,
                    globalGptImage2Notes: input.globalGptImage2Notes,
                    panels: input.panels
                  },
                  null,
                  2
                ),
                "",
                "Prompt suggestion from admin:",
                input.promptSuggestion,
                "",
                "Revision requirements:",
                "- Keep the same pageNumber.",
                "- Keep panelCount at 2 or 3.",
                "- Improve pagePurpose, promptPackCopyText, referenceNotesCopyText, and panel story beats to reflect the suggestion.",
                "- Keep the full page content, all panels, all important reference instructions, and the final visual locks. Do not cut off the prompt mid-sentence.",
                "- Keep or improve the visible dialogue for every panel. Do not remove all dialogue from the page.",
                "- Every panel must return dialogueLines with exact speaker names and exact text to render in balloons or captions.",
                "- The promptPackCopyText must include those exact dialogue lines and must tell gpt-image-2 to render them in consistent clean manga lettering.",
                "- Keep character model-sheet identity locked.",
                "- Make sure every full-body character keeps visible small rounded feet or foot nubs with the lower frame edge below the feet.",
                "- Keep the feet connected to the body as one continuous mascot form; do not add a hard horizontal dividing line, shoe line, or solid seam between body and feet.",
                "- If Sunny Spritz appears, explicitly preserve two small rounded feet directly under her soft five-point star body.",
                "- Keep all characters handless and armless; use telekinesis for object interaction.",
                "- Keep clean high-contrast black-and-white manga style, pure white character bodies, and no gray wash.",
                "- Use one consistent rounded manga lettering style across speech balloons, captions, and SFX."
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
          name: "revised_comic_page_prompt",
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
        : null) || `OpenAI page prompt revision failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);
  const revised = outputText ? safeJsonParse(outputText) : null;

  if (!revised || typeof revised !== "object" || Array.isArray(revised)) {
    throw new Error("OpenAI did not return a valid revised page prompt.");
  }

  const record = revised as Record<string, any>;
  const panels = Array.isArray(record.panels)
    ? record.panels
        .map((panel) => ({
          panelNumber: Number(panel.panelNumber),
          panelTitle: typeof panel.panelTitle === "string" ? panel.panelTitle.trim() : "",
          storyBeat: typeof panel.storyBeat === "string" ? panel.storyBeat.trim() : "",
          promptText: typeof panel.promptText === "string" ? panel.promptText.trim() : "",
          dialogueLines: normalizeComicDialogueLines(panel.dialogueLines)
        }))
        .filter(
          (panel) =>
            panel.panelNumber >= 1 &&
            panel.panelTitle &&
            panel.storyBeat &&
            panel.promptText &&
            panel.dialogueLines.length > 0
        )
    : [];

  if (panels.length < 2) {
    throw new Error("OpenAI returned too few revised panel beats.");
  }

  const normalizedPanels = panels.slice(0, 3).map((panel, index) => ({
    ...panel,
    pageNumber: input.pageNumber,
    panelNumber: index + 1
  }));
  const promptPackCopyText =
    typeof record.promptPackCopyText === "string" && record.promptPackCopyText.trim()
      ? ensurePromptIncludesDialogueAndLettering(record.promptPackCopyText, normalizedPanels)
      : ensurePromptIncludesDialogueAndLettering(input.promptPackCopyText, normalizedPanels);
  const referenceNotesCopyText =
    typeof record.referenceNotesCopyText === "string" && record.referenceNotesCopyText.trim()
      ? ensureReferenceNotesIncludeLettering(record.referenceNotesCopyText)
      : ensureReferenceNotesIncludeLettering(input.referenceNotesCopyText);

  return {
    pageNumber: input.pageNumber,
    panelCount: normalizedPanels.length,
    pagePurpose:
      typeof record.pagePurpose === "string" && record.pagePurpose.trim()
        ? record.pagePurpose.trim()
        : input.pagePurpose,
    promptPackCopyText,
    referenceNotesCopyText,
    panels: normalizedPanels
  };
}

type ComicPromptPackageAiOptions = {
  openAiResponseId?: string | null;
  background?: boolean;
};

export async function generateComicPromptPackageWithAi(
  input: GenerateComicPromptPackageInput
): Promise<GeneratedComicPromptPackage>;

export async function generateComicPromptPackageWithAi(
  input: GenerateComicPromptPackageInput,
  options: ComicPromptPackageAiOptions & { background: true }
): Promise<GeneratedComicPromptPackage | PendingComicPromptPackage>;

export async function generateComicPromptPackageWithAi(
  input: GenerateComicPromptPackageInput,
  options: ComicPromptPackageAiOptions = {}
): Promise<GeneratedComicPromptPackage | PendingComicPromptPackage> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      episodeLogline: { type: "string", minLength: 30, maxLength: 320 },
      episodeSynopsis: { type: "string", minLength: 120, maxLength: 760 },
      episodeScript: { type: "string", minLength: 420, maxLength: 5200 },
      pagePlan: { type: "string", minLength: 240, maxLength: 3600 },
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
            pagePurpose: { type: "string", minLength: 12, maxLength: 320 },
            promptPackCopyText: { type: "string", minLength: 160, maxLength: 3400 },
            referenceNotesCopyText: { type: "string", minLength: 120, maxLength: 2400 },
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
                  panelTitle: { type: "string", minLength: 4, maxLength: 140 },
                  storyBeat: { type: "string", minLength: 12, maxLength: 360 },
                  promptText: { type: "string", minLength: 60, maxLength: 920 },
                  dialogueLines: {
                    type: "array",
                    minItems: 1,
                    maxItems: 4,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        speaker: { type: "string", minLength: 2, maxLength: 80 },
                        text: { type: "string", minLength: 1, maxLength: 160 }
                      },
                      required: ["speaker", "text"]
                    }
                  }
                },
                required: [
                  "pageNumber",
                  "panelNumber",
                  "panelTitle",
                  "storyBeat",
                  "promptText",
                  "dialogueLines"
                ]
              }
            },
            requiredUploads: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  bucket: { type: "string", enum: ["CHARACTER", "SCENE", "CHAPTER_SCENE"] },
                  label: { type: "string", minLength: 2, maxLength: 120 },
                  slug: { type: "string", minLength: 1, maxLength: 120 },
                  whyThisMatters: { type: "string", minLength: 12, maxLength: 260 },
                  contentSummary: { type: "string", minLength: 12, maxLength: 360 },
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

  const openAiResponseId = options.openAiResponseId?.trim() || "";
  const useBackgroundMode =
    options.background === true && shouldUseOpenAiComicPromptBackgroundMode() && !openAiResponseId;
  const requestBody: Record<string, unknown> = {
    model: DEFAULT_OPENAI_COMIC_PROMPT_MODEL,
    ...(useBackgroundMode ? { background: true, store: true } : {}),
    input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are Neatique's comic story architect and prompt planner.",
                "Your job is to turn a season/chapter/episode outline into a production-ready comic prompt package.",
                "The input outlines may be written in Chinese, but every generated script, page plan, panel beat, image prompt, and reference note must be written in English.",
                "Keep character names in English exactly as provided; do not translate character names in any prompt output.",
                "Keep characters visually stable, emotionally consistent, and aligned with their stored canon.",
                "Treat each character's Canon profile MD as a binding identity contract. Use it together with the listed model-sheet image files whenever that character appears.",
                "When similar mascot characters appear, explicitly preserve their differences in silhouette, face placement, highlights, feet, mouth style, body proportions, and default expression.",
                "Every visual prompt must enforce clean high-contrast black-and-white manga output only, with pure white character fills and no gray wash.",
                "Every visual prompt must enforce that all characters have no hands and no arms, while preserving small rounded feet, foot nubs, or lower-body nubs exactly as shown in their model sheets.",
                "Every full-body character view must include the character's visible small feet with clear lower-frame space. Sunny Spritz must keep two small rounded feet directly under her soft five-point star body.",
                "Every visual prompt must enforce connected feet: the feet and body are one continuous mascot form with no hard horizontal outline, shoe line, or solid separating stroke between them.",
                "Every visual prompt must enforce mouth-state continuity: characters who are not speaking keep closed or tiny neutral mouths; only the active speaker or explicit vocal reaction may have an open mouth.",
                "Every page and every panel must include usable dialogueLines. Do not produce dialogue-free comic pages.",
                "Every promptPackCopyText block must include the exact dialogue text to render on the page, organized by panel.",
                "Every visual prompt must enforce one consistent lettering style for all dialogue balloons, captions, and SFX.",
                "Any action that would normally require hands must be staged as gentle telekinesis: nearby objects float, slide, open, tilt, or move with manga motion cues.",
                "Muci must always match the Muci model sheet and written appearance lock exactly: compact cute friendly teardrop mascot, centered point, broad rounded base, short rounded body proportions, large dot eyes, open friendly smile, glossy highlight marks near the upper-left side, two small rounded feet at the bottom, soft approachable protagonist energy.",
                "Muci must never become tall, thin, stretched, elongated, pear-like, or a long raindrop. Keep him broad, squat, soft, and close to the model-sheet width-to-height proportion.",
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
                `Short description: ${trimPromptContext(input.project.shortDescription, 420)}`,
                `Story outline: ${trimPromptContext(input.project.storyOutline, 1600)}`,
                `World rules: ${trimPromptContext(input.project.worldRules, 1400)}`,
                `Visual style guide: ${trimPromptContext(input.project.visualStyleGuide, 1800)}`,
                `Workflow notes: ${trimPromptContext(input.project.workflowNotes || "None", 700)}`,
                "",
                "Season context:",
                `Title: ${input.season.title}`,
                `Summary: ${trimPromptContext(input.season.summary, 420)}`,
                `Outline: ${trimPromptContext(input.season.outline, 1000)}`,
                "",
                "Chapter context:",
                `Title: ${input.chapter.title}`,
                `Summary: ${trimPromptContext(input.chapter.summary, 520)}`,
                `Outline: ${trimPromptContext(input.chapter.outline, 2600)}`,
                "",
                "Episode context:",
                `Title: ${input.episode.title}`,
                `Summary: ${trimPromptContext(input.episode.summary, 620)}`,
                `Outline: ${trimPromptContext(input.episode.outline, 5200)}`,
                "",
                "Global visual production locks that must appear in the page prompts and notes:",
                COMIC_VISUAL_PRODUCTION_LOCKS,
                "",
                "Global lettering locks that must appear in the page prompts and notes:",
                COMIC_LETTERING_STYLE_LOCKS,
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
                "- Write the entire returned JSON content in English, even if the stored outlines are Chinese.",
                "- Keep every character name in English exactly as provided.",
                "- Expand the episode into a readable production script.",
                "- The episodeScript must include dialogue, not only prose narration.",
                "- Create a 10-page plan.",
                "- Keep every returned field compact enough for a production dashboard; avoid repeating the same global locks verbatim inside every field.",
                "- Every page should normally contain 3 panels.",
                "- A page may contain 2 panels only when the beat is visually important enough to justify extra space.",
                `- Assume the image generation step will use ${DEFAULT_OPENAI_COMIC_IMAGE_MODEL}.`,
                "- Every panel must include 1 to 4 dialogueLines with exact visible text. Use a character name as speaker for speech, or Caption/SFX only when a panel truly needs non-spoken text.",
                "- Each dialogue line should be short, natural, and renderable inside a speech balloon or caption box.",
                "- Every panel promptText must describe the speech balloon/caption/SFX placement and identify which character is speaking.",
                "- Every promptPackCopyText block must include a Dialogue and lettering plan section listing every panel's exact dialogue lines.",
                "- Every promptPackCopyText block must tell gpt-image-2 to render all listed dialogue lines and not omit speech balloons.",
                "- Every promptPackCopyText block must enforce one consistent clean rounded manga lettering style across balloons, captions, and SFX.",
                "- Every promptPackCopyText block must state clean black-and-white manga only, no color, no gray wash, pure white character bodies.",
                "- Every promptPackCopyText block must state that characters have no hands or arms, while preserving model-sheet small feet, foot nubs, or lower-body nubs exactly.",
                "- Every promptPackCopyText block must include a lower-frame foot visibility check for full-body characters.",
                "- Every promptPackCopyText block must state that feet connect naturally to the body without a hard dividing line, shoe line, seam, or solid separating stroke.",
                "- Every promptPackCopyText block must include a mouth-state check: non-speaking characters keep closed mouths, and only speaking or explicitly vocal characters may have open mouths.",
                "- Every promptPackCopyText block that includes Sunny Spritz must explicitly state that she keeps two small rounded feet directly under her soft five-point star body.",
                "- Every promptPackCopyText block must translate hand actions into telekinetic object movement.",
                "- Every Muci prompt must explicitly preserve his model-sheet identity, compact broad centered-teardrop design, pure white body fill, and two small rounded feet.",
                "- Every referenceNotesCopyText block must remind production that character model sheets are exact identity locks, not loose inspiration.",
                "- Every referenceNotesCopyText block must also remind production to read the character Profile MD lock together with the uploaded model sheet before drawing that character.",
                "- For every page, return a promptPackCopyText block that can be pasted directly into the image-generation tool.",
                "- For every page, return a referenceNotesCopyText block that can also be pasted directly into the image-generation tool or production notes.",
                "- For every panel, tell the team which visual beat is happening and what needs to stay stable.",
                "- Prefer the chapter-specific scene reference files whenever the page happens in a known chapter scene location.",
                "- Required uploads must be organized per page, and each item must include real upload image file names plus the matching relative paths.",
                "- Use CHARACTER for character model sheets, SCENE for reusable master location refs, and CHAPTER_SCENE for chapter-only location sheets.",
                "- The global gpt-image-2 notes should explain how to preserve continuity, camera logic, reference reuse, clean high-contrast black-and-white manga style, pure white character fills, model-sheet exactness, mouth-state continuity, handless telekinetic action, exact dialogue rendering, and consistent lettering style across all 10 pages.",
                "- Keep the tone useful, concrete, and ready for actual image production."
              ].join("\n")
            }
          ]
        }
      ],
    reasoning: {
      effort: OPENAI_COMIC_PROMPT_REASONING_EFFORT
    },
    text: {
      format: {
        type: "json_schema",
        name: "comic_prompt_package",
        strict: true,
        schema
      }
    }
  };

  const parsed = openAiResponseId
    ? await retrieveOpenAiComicPromptPackageResponse(apiKey, openAiResponseId)
    : await createOpenAiComicPromptPackageResponse(apiKey, requestBody);
  const pending = getPendingComicPromptPackage(parsed);

  if (pending) {
    return pending;
  }

  assertOpenAiPromptPackageIsComplete(parsed);

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
        page.panels.every(
          (panel) =>
            typeof panel.promptText === "string" &&
            Array.isArray(panel.dialogueLines) &&
            normalizeComicDialogueLines(panel.dialogueLines).length > 0
        ) &&
        Array.isArray(page.requiredUploads) &&
        typeof page.promptPackCopyText === "string" &&
        typeof page.referenceNotesCopyText === "string"
      );
    });

  if (!hasValidPageShape) {
    throw new Error("OpenAI returned pages that do not match the 10-page comic workflow.");
  }

  const normalizedPages = pages
    .map((page) => {
      const normalizedPanels = [...page.panels]
        .map((panel) => ({
          ...panel,
          promptText: panel.promptText.trim(),
          dialogueLines: normalizeComicDialogueLines(panel.dialogueLines)
        }))
        .sort((left, right) => left.panelNumber - right.panelNumber);

      return {
        ...page,
        promptPackCopyText: ensurePromptIncludesDialogueAndLettering(
          page.promptPackCopyText,
          normalizedPanels
        ),
        referenceNotesCopyText: ensureReferenceNotesIncludeLettering(page.referenceNotesCopyText),
        panels: normalizedPanels,
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
      };
    })
    .sort((left, right) => left.pageNumber - right.pageNumber);

  return {
    episodeLogline: normalizedOutput.episodeLogline.trim(),
    episodeSynopsis: normalizedOutput.episodeSynopsis.trim(),
    episodeScript: normalizedOutput.episodeScript.trim(),
    pagePlan: normalizedOutput.pagePlan.trim(),
    pages: normalizedPages,
    globalGptImage2Notes: ensureReferenceNotesIncludeLettering(
      normalizedOutput.globalGptImage2Notes
    )
  };
}
