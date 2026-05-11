import { Buffer } from "node:buffer";
import type { ComicReferenceImageFile } from "@/lib/comic-reference-images";
import type { ComicCharacterIdentityLock } from "@/lib/comic-character-identity";
import {
  formatComicCharacterChineseNameLocks,
  type ComicCharacterChineseNameLock
} from "@/lib/comic-character-chinese-names";
import {
  buildComicCharacterHeightChartLock,
  buildSimilarTeardropSeparationLock,
  SIMILAR_TEARDROP_COMPARISON_REFERENCE
} from "@/lib/comic-similar-character-locks";
import {
  COMIC_COVER_PAGE_NUMBER,
  formatComicPageLabel,
  isComicCoverPageNumber
} from "@/lib/comic-pages";
import sharp from "sharp";

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
const DEFAULT_OPENAI_COMIC_OUTLINE_TIMEOUT_MS = 1000 * 60 * 10;
const MAX_OPENAI_COMIC_OUTLINE_TIMEOUT_SECONDS = 60 * 13;
const DEFAULT_OPENAI_COMIC_PROMPT_TIMEOUT_MS = 1000 * 55;
const DEFAULT_OPENAI_COMIC_IMAGE_TIMEOUT_MS = 1000 * 120;
const DEFAULT_OPENAI_COMIC_IMAGE_HIGH_TIMEOUT_MS = 1000 * 240;
const DEFAULT_OPENAI_COMIC_IMAGE_LOW_TIMEOUT_MS = 1000 * 75;
const DEFAULT_OPENAI_COMIC_IMAGE_MODEL = process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2";
const OPENAI_COMIC_IMAGE_PROMPT_MAX_LENGTH = 30000;
const MUCI_MODEL_SHEET_EXACT_LOCK = [
  "Muci Model Sheet Exact Lock:",
  "- Use comic/characters/muci/refs/model-sheet.jpg as the visual source: broad squat white droplet, round heavy lower half, consistent reader-left/page-left top lean, two attached feet, friendly U-smile, no brow, upper-left highlights.",
  "- Muci must always read as the left-leaning droplet in primary front/3/4 reader-facing views. If Muci starts reading as Nia, Snacri's right-leaning top, a hooked/curling top, a tall raindrop, or a generic teardrop, redraw him shorter, wider, rounder, browless, left-leaning, and closer to the model sheet."
].join("\n");
const COMIC_VISUAL_PRODUCTION_LOCKS = [
  "Compact visual production guidance:",
  "- Clean high-contrast black-and-white Japanese manga only, with pure white mascot body fills and light controlled screentone.",
  "- Uploaded model sheets are the primary identity authority. Match silhouette, face placement, body proportion, highlights, feet, and point direction from the image files.",
  "- All mascots are handless and armless. Convert holding, pointing, opening, carrying, and writing actions into gentle telekinetic object movement.",
  "- Full-body mascots keep the small connected feet shown in their model sheets. Never crop, hide, separate, or add extra feet/legs.",
  "- Do not paste long identity paragraphs into each page prompt. Use requiredUploads/model-sheet files plus one short active-character risk reminder only when needed.",
  MUCI_MODEL_SHEET_EXACT_LOCK,
  "- When similar droplet characters appear together, requiredUploads must include their model sheets and the comparison reference; prompts should separate them with short silhouette reminders.",
  "- Padaruna active-character reminder: sharp centered head plus lower-heavy chubby pear-bottom body with a visibly wide soft lower belly; never Nia's tall narrow controlled droplet.",
  "- Height tiers are off-canvas production guidance only: Muci/Artrans shorter, Padaruna/Padarana/Snacri standard, Nia about 1.1x Padaruna. Never draw a chart or lineup as story content.",
  "- Visible text must be limited to the page dialogue, captions, SFX, signs, prop labels, or labels explicitly whitelisted for that page."
].join("\n");
const COMIC_IMAGE_PRODUCTION_LOCKS = [
  "Core image locks:",
  "- Use the attached reference images as the main visual authority. Character model sheets lock silhouette, face placement, body fill, proportions, highlights, and feet.",
  "- Product lock reference images are binding prop identity references. When a locked product appears, copy the attached bottle shape and large front code instead of inventing packaging.",
  "- Clean high-contrast black-and-white Japanese manga only. Pure white mascot body fills. No color, gray wash, muddy shading, or heavy body screentone.",
  "- All mascot characters are handless and armless. Show object handling with gentle telekinesis, floating props, and small manga motion cues.",
  "- Full-body droplet characters have exactly two small connected feet/foot nubs. Do not add third feet, shoes, toes, side nubs, arms, or detached appendages.",
  "- Do not copy readable text from model sheets, profiles, reference labels, or continuity notes unless it is explicitly listed in this page's visible-text whitelist.",
  "- Height/comparison references are off-canvas production guides only. Never draw charts, labels, lineups, or scale marks in story panels.",
  "- Character-specific risks are listed later only for characters on the current page; do not import unrelated character traits."
].join("\n");
const COMIC_LETTERING_STYLE_LOCKS = [
  "Comic lettering style locks:",
  "- Use one consistent lettering style across the whole comic: clean rounded manga hand-lettering, black ink on white balloons or white caption boxes.",
  "- Speech balloons must have simple white fill, crisp black outlines, consistent line weight, and clear tails pointing to the speaking character.",
  "- Keep dialogue text short enough to fit inside its balloon with generous padding. Do not shrink text unevenly, mix fonts, or use decorative type.",
  "- Captions and SFX must use the same clean manga lettering family, with SFX hand-drawn but still readable and consistent.",
  "- Do not invent extra visible text. Render only the exact dialogue, captions, SFX, signs, or labels named in the page prompt."
].join("\n");
const COMIC_COVER_TYPOGRAPHY_LOCKS = [
  "Cover typography locks:",
  "- The cover has no character dialogue, no speech balloons, no caption boxes, and no SFX.",
  "- The cover must not include character first-appearance introduction boxes, profile boxes, name cards, role cards, or cast bio labels.",
  "- The cover does not count as any character's first appearance; first-appearance introduction boxes belong only on story pages 1-10.",
  "- Use one unified serif typeface for all rendered cover text below the uploaded logo.",
  "- Keep the serif title lettering elegant, high-contrast, centered, and consistent; do not mix fonts or add decorative text.",
  "- Render only the uploaded logo and the exact episode title line specified in the prompt."
].join("\n");
const COMIC_COVER_EPISODE_ONE_LAYOUT_LOCKS = [
  "Episode 1 cover layout template lock:",
  "- For every cover after Episode 1, match Episode 1's cover layout exactly: same top logo centerline, logo size, Episode title position, logo-to-title spacing, title-to-frame spacing, and lower rectangle frame x/y/width/height.",
  "- Keep the logo/title stack fixed at the top; only change the Episode title text.",
  "- Keep the large lower rectangular manga frame the same size and position as Episode 1. Do not make the frame taller, shorter, wider, narrower, higher, or lower to fit the scene.",
  "- Stage the character interaction inside that fixed rectangle only; crop, scale, and compose the characters within the frame without moving or resizing the frame."
].join("\n");
const COMIC_COVER_INTERACTION_DESIGN_LOCKS = [
  "Cover interaction design locks:",
  "- The lower cover frame must show one specific silent visual hook, not a static lineup, model-sheet group, or characters simply posing in front of a location.",
  "- Build the hook from the episode premise: a playful misunderstanding, object surprise, awkward pause, tiny victory, role reversal, near-miss, or reaction-chain moment.",
  "- Give every visible main character a distinct readable expression or reaction: curious lean, wide-eyed surprise, smug tiny smile, nervous sweat-drop mark, deadpan stare, bashful tilt, determined squint, or another episode-appropriate silent expression. Do not use identical neutral faces.",
  "- Stage the characters in an asymmetric relationship: one character causes or reveals the problem, one notices too late, one reacts, and one tries to contain the moment. Use eye-lines, body tilts, spacing, and motion lines so the interaction reads instantly.",
  "- Use one to three episode-relevant props or environmental details as the engine of the joke or emotional interaction. If the action would require hands, show the objects floating, tipping, opening, sliding, or bouncing through gentle telekinesis.",
  "- Keep it poster-clear: one focal gag or emotional beat, big silhouettes, expressive faces, elegant negative space, and no crowded cast lineup."
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
  chineseName?: string | null;
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

type ComicProductLockContext = {
  displayName: string;
  shortCode: string;
  slug: string;
  visualNotes: string;
  usageNotes: string;
  referenceNotes: string | null;
  imageUrl?: string | null;
  imageGeneratedAt?: Date | null;
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
  episodeNumber?: number | null;
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
  bucket: "CHARACTER" | "SCENE" | "CHAPTER_SCENE" | "BRAND_LOGO";
  label: string;
  slug: string;
  whyThisMatters: string;
  contentSummary: string;
  uploadImageNames: string[];
  relativePaths: string[];
};

export type GeneratedComicPagePrompt = {
  pageNumber: number;
  panelCount: 1 | 2 | 3;
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
  pageLabel?: string;
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
  pageLabel?: string;
  panelCount: number;
  pagePurpose: string;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  globalGptImage2Notes: string | null;
  panels: GeneratedComicPanelPrompt[];
  requiredUploads: GeneratedComicPageUpload[];
  referenceImages?: ComicReferenceImageFile[];
  characterLocks?: ComicCharacterIdentityLock[];
  productLocks?: ComicProductLockContext[];
  generationAttempt?: number;
};

export type GeneratedComicPageImageAsset = {
  mimeType: string;
  base64Data: string;
};

export type GenerateStandaloneComicImageInput = {
  prompt: string;
  aspectRatio: string;
  quality?: string | null;
  referenceImage?: ComicPageImageReferenceAsset | null;
  referenceImages?: ComicPageImageReferenceAsset[];
  generationAttempt?: number;
};

export type ComicPageImageReferenceAsset = {
  mimeType: string;
  base64Data: string;
  fileName: string;
};

type PreparedComicImageInput = {
  mimeType: string;
  data: ArrayBuffer;
  fileName: string;
};

type ComicPageImageEditPageContext = {
  pagePurpose?: string | null;
  promptPackCopyText?: string | null;
  referenceNotesCopyText?: string | null;
  panels?: GeneratedComicPanelPrompt[];
};

type GenerateComicPromptPackageInput = {
  project: ComicProjectContext;
  season: ComicSeasonContext;
  chapter: ComicChapterContext;
  episode: ComicEpisodeContext;
  characters: ComicCharacterContext[];
  scenes: ComicSceneContext[];
  productLocks?: ComicProductLockContext[];
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
  characterNameLocks?: ComicCharacterChineseNameLock[];
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
  characterNameLocks?: ComicCharacterChineseNameLock[];
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
  characterNameLocks?: ComicCharacterChineseNameLock[];
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

  return Math.min(Math.max(configuredSeconds, 15), MAX_OPENAI_COMIC_OUTLINE_TIMEOUT_SECONDS) * 1000;
}

function getOpenAiComicPromptTimeoutMs() {
  const configuredSeconds = Number.parseInt(process.env.OPENAI_COMIC_PROMPT_TIMEOUT_SECONDS || "", 10);

  if (!Number.isFinite(configuredSeconds) || configuredSeconds <= 0) {
    return DEFAULT_OPENAI_COMIC_PROMPT_TIMEOUT_MS;
  }

  return Math.min(Math.max(configuredSeconds, 15), 55) * 1000;
}

function getDefaultOpenAiComicImageTimeoutMs(quality?: string | null) {
  switch (normalizeStandaloneComicImageQuality(quality)) {
    case "high":
      return DEFAULT_OPENAI_COMIC_IMAGE_HIGH_TIMEOUT_MS;
    case "low":
      return DEFAULT_OPENAI_COMIC_IMAGE_LOW_TIMEOUT_MS;
    case "medium":
    default:
      return DEFAULT_OPENAI_COMIC_IMAGE_TIMEOUT_MS;
  }
}

function getOpenAiComicImageTimeoutMs(quality?: string | null) {
  const configuredSeconds = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_TIMEOUT_SECONDS || "", 10);

  if (!Number.isFinite(configuredSeconds) || configuredSeconds <= 0) {
    return getDefaultOpenAiComicImageTimeoutMs(quality);
  }

  return Math.min(Math.max(configuredSeconds, 20), 260) * 1000;
}

function getOpenAiComicOutlineAbortSignal() {
  return AbortSignal.timeout(getOpenAiComicOutlineTimeoutMs());
}

function getOpenAiComicPromptAbortSignal() {
  return AbortSignal.timeout(getOpenAiComicPromptTimeoutMs());
}

function getOpenAiComicImageAbortSignal(quality?: string | null) {
  return AbortSignal.timeout(getOpenAiComicImageTimeoutMs(quality));
}

function getOpenAiComicImageQuality(attempt = 1) {
  const configured = process.env.OPENAI_COMIC_IMAGE_QUALITY?.trim();

  if (configured) {
    return configured;
  }

  return attempt >= 3 ? "low" : "medium";
}

function normalizeStandaloneComicImageQuality(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  const canonical = normalized === "mediem" ? "medium" : normalized;

  return ["high", "medium", "low"].includes(canonical) ? canonical : "";
}

function getStandaloneComicImageQuality(value: string | null | undefined, attempt: number) {
  return normalizeStandaloneComicImageQuality(value) || getOpenAiComicImageQuality(attempt);
}

function getStandaloneComicImageQualityGuide(quality: string) {
  switch (quality) {
    case "high":
      return "Quality mode: high. Use final-art polish, stronger detail, cleaner texture, and more precise prompt adherence. Keep the composition focused so the high-quality request can finish reliably.";
    case "low":
      return "Quality mode: low. Prioritize a clear readable draft, simple composition, and reliable completion over fine detail.";
    case "medium":
    default:
      return "Quality mode: medium. Balance detail, prompt adherence, and generation reliability.";
  }
}

function getOpenAiComicImageOutputFormat() {
  const configured = (process.env.OPENAI_COMIC_IMAGE_OUTPUT_FORMAT || "jpeg").trim().toLowerCase();

  if (configured === "jpg") {
    return "jpeg";
  }

  return ["png", "jpeg"].includes(configured) ? configured : "jpeg";
}

function getOpenAiComicImageOutputCompression() {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_OUTPUT_COMPRESSION || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 70;
  }

  return Math.min(Math.max(configured, 50), 100);
}

function getOpenAiComicImageEditQuality() {
  const configured = process.env.OPENAI_COMIC_IMAGE_EDIT_QUALITY?.trim();

  return configured || "low";
}

function getOpenAiComicImageEditSourceQuality(attempt = 1) {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_EDIT_SOURCE_QUALITY || "", 10);

  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(Math.max(configured, 45), 90);
  }

  return attempt >= 2 ? 58 : 68;
}

function getOpenAiComicImageEditSourceMaxWidth() {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_EDIT_SOURCE_MAX_WIDTH || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 1024;
  }

  return Math.min(Math.max(configured, 768), 1536);
}

function getOpenAiComicImageEditSourceMaxHeight() {
  const configured = Number.parseInt(process.env.OPENAI_COMIC_IMAGE_EDIT_SOURCE_MAX_HEIGHT || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 1536;
  }

  return Math.min(Math.max(configured, 1152), 2048);
}

function getOpenAiComicImageMimeType(outputFormat: string) {
  if (outputFormat === "jpeg") {
    return "image/jpeg";
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

function getOpenAiComicImageTimeoutMessage(label: string, quality?: string | null) {
  const normalizedQuality = normalizeStandaloneComicImageQuality(quality);
  const qualityLabel = normalizedQuality ? ` in ${normalizedQuality} quality mode` : "";

  return `${label} timed out after ${Math.round(
    getOpenAiComicImageTimeoutMs(quality) / 1000
  )} seconds${qualityLabel}. The image task can be retried automatically; if this keeps happening, use a simpler reference/prompt setup or retry in Medium quality.`;
}

async function fetchOpenAiComicImageResponse(
  url: string,
  init: RequestInit,
  label: string,
  quality?: string | null
) {
  try {
    return await fetch(url, {
      ...init,
      signal: getOpenAiComicImageAbortSignal(quality)
    });
  } catch (error) {
    if (isOpenAiTimeoutError(error)) {
      throw new Error(getOpenAiComicImageTimeoutMessage(label, quality));
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
    "Use locked Simplified Chinese character names in Chinese fields when provided, and keep English character names in English companion fields.",
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
    formatComicCharacterChineseNameLocks(input.characterNameLocks),
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
    "- In Chinese summary and outline, use locked Chinese character names when provided; otherwise keep the English character name.",
    "- In summaryEn and outlineEn, keep English character names exactly.",
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
    formatOutlineNames("English character names", input.characterNames),
    formatComicCharacterChineseNameLocks(input.characterNameLocks),
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
    "- In Chinese summary and outline, use locked Chinese character names when provided; otherwise keep the English character name.",
    "- In summaryEn and outlineEn, keep English character names exactly.",
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
              "Use locked Chinese character names in Chinese fields when provided, and keep English names in English companion fields.",
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
    formatComicCharacterChineseNameLocks(input.characterNameLocks),
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
    "- In Chinese summary and outline, use locked Chinese character names when provided; otherwise keep the English character name.",
    "- In summaryEn and outlineEn, keep English character names exactly.",
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

function parseStandaloneAspectRatio(value: string) {
  const match = value.trim().match(/^(\d+):(\d+)$/);

  if (!match) {
    return {
      label: "1:1",
      width: 1,
      height: 1
    };
  }

  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      label: "1:1",
      width: 1,
      height: 1
    };
  }

  return {
    label: `${width}:${height}`,
    width,
    height
  };
}

function getStandaloneComicImageApiSize(aspectRatio: string) {
  const parsed = parseStandaloneAspectRatio(aspectRatio);
  const ratio = parsed.width / parsed.height;

  if (Math.abs(ratio - 1) < 0.01) {
    return "1024x1024";
  }

  return ratio > 1 ? "1536x1024" : "1024x1536";
}

async function cropStandaloneComicImageToAspectRatio(
  image: GeneratedComicPageImageAsset,
  aspectRatio: string
): Promise<GeneratedComicPageImageAsset> {
  const parsed = parseStandaloneAspectRatio(aspectRatio);
  const targetRatio = parsed.width / parsed.height;
  const sourceBuffer = Buffer.from(image.base64Data, "base64");
  const normalizedBuffer = await sharp(sourceBuffer).rotate().toBuffer();
  const metadata = await sharp(normalizedBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (!width || !height) {
    return image;
  }

  const sourceRatio = width / height;
  let extractWidth = width;
  let extractHeight = height;
  let left = 0;
  let top = 0;

  if (sourceRatio > targetRatio) {
    extractWidth = Math.max(1, Math.round(height * targetRatio));
    left = Math.max(0, Math.floor((width - extractWidth) / 2));
  } else if (sourceRatio < targetRatio) {
    extractHeight = Math.max(1, Math.round(width / targetRatio));
    top = Math.max(0, Math.floor((height - extractHeight) / 2));
  }

  let pipeline = sharp(normalizedBuffer).extract({
    left,
    top,
    width: extractWidth,
    height: extractHeight
  });
  const outputFormat = getOpenAiComicImageOutputFormat();
  let outputBuffer: Buffer;

  if (outputFormat === "png") {
    outputBuffer = await pipeline.png().toBuffer();
  } else {
    outputBuffer = await pipeline
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: getOpenAiComicImageOutputCompression(), mozjpeg: true })
      .toBuffer();
  }

  return {
    mimeType: getOpenAiComicImageMimeType(outputFormat),
    base64Data: outputBuffer.toString("base64")
  };
}

async function normalizeStandaloneReferenceImageForAi(
  image: ComicPageImageReferenceAsset
): Promise<ComicPageImageReferenceAsset> {
  try {
    const inputBuffer = Buffer.from(image.base64Data, "base64");
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 1536,
        height: 1536,
        fit: "inside",
        withoutEnlargement: true
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return {
      mimeType: "image/jpeg",
      base64Data: outputBuffer.toString("base64"),
      fileName: image.fileName.replace(/\.[a-z0-9]+$/i, "") + ".jpg"
    };
  } catch {
    return image;
  }
}

function getStandaloneReferenceImages(input: GenerateStandaloneComicImageInput) {
  const references =
    input.referenceImages && input.referenceImages.length > 0
      ? input.referenceImages
      : input.referenceImage
        ? [input.referenceImage]
        : [];

  return references.filter((reference) => reference.base64Data).slice(0, 5);
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
          `  Chinese name: ${character.chineseName || "None"}`,
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

function buildProductLockSummary(productLocks: ComicProductLockContext[] = []) {
  if (productLocks.length === 0) {
    return "No product locks are active or relevant for this episode.";
  }

  return productLocks
    .map((productLock) =>
      [
        `- ${productLock.displayName} (${productLock.shortCode}, slug: ${productLock.slug})`,
        `  Reference image: ${
          productLock.imageUrl
            ? "generated product lock image is attached when this product is relevant; follow that bottle exactly."
            : "no generated product lock image is stored yet; use the text lock only as fallback."
        }`,
        `  Visual lock: ${trimPromptContext(productLock.visualNotes, 620)}`,
        `  Usage lock: ${trimPromptContext(productLock.usageNotes, 520)}`,
        `  Storefront note: ${trimPromptContext(productLock.referenceNotes || "None", 360)}`
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

function normalizeComicReferenceFileMentions(value: string | null | undefined) {
  return (value || "")
    .replace(/refs\/model-sheet\.png/g, "refs/model-sheet.jpg")
    .replace(/model-sheet\.png/g, "model-sheet.jpg")
    .replace(/comic\/characters\/([^/\s]+)\/refs\/model-sheet\.png/g, "comic/characters/$1/refs/model-sheet.jpg")
    .replace(/comic\/seasons\/([^\n,]+?)\.png/g, "comic/seasons/$1.jpg");
}

function normalizeLegacyCoachRayShapeMentions(value: string | null | undefined) {
  return (value || "")
    .replace(
      /Exact Coach Ray pentagonal shape and feet/gi,
      "Exact Coach Ray shield-shaped body, shield crest, vertical sides, grounded base, and feet"
    )
    .replace(/Coach Ray must stay broad pentagonal/gi, "Coach Ray must stay broad shield-shaped")
    .replace(/Coach Ray must remain broad pentagonal/gi, "Coach Ray must remain broad shield-shaped")
    .replace(/Coach Ray remains broad pentagonal/gi, "Coach Ray remains broad shield-shaped")
    .replace(/Coach Ray's pentagonal authority/gi, "Coach Ray's shield-shaped authority")
    .replace(/Coach Ray pentagonal authority/gi, "Coach Ray shield-shaped authority")
    .replace(/Coach Ray as pentagonal/gi, "Coach Ray with shield-shaped protective wording")
    .replace(/Coach Ray pentagonal shape/gi, "Coach Ray shield-shaped body")
    .replace(/Coach Ray pentagonal/gi, "Coach Ray shield-shaped")
    .replace(/broad pentagonal and planted/gi, "broad shield-shaped and planted")
    .replace(/broad pentagonal, planted/gi, "broad shield-shaped, planted")
    .replace(/broad pentagonal/gi, "broad shield-shaped");
}

function normalizeLegacyProfessorCeraLinShapeMentions(value: string | null | undefined) {
  return (value || "")
    .replace(
      /Professor Cera Lin keeps her pointed pentagonal composed professor silhouette/gi,
      "Professor Cera Lin keeps her rounded six-sided hexagon professor silhouette"
    )
    .replace(
      /Professor Cera Lin stays pointed pentagonal and composed/gi,
      "Professor Cera Lin stays rounded six-sided hexagon and composed"
    )
    .replace(
      /Professor Cera Lin pointed pentagonal and composed/gi,
      "Professor Cera Lin rounded six-sided hexagon and composed"
    )
    .replace(
      /Professor Cera Lin pointed pentagonal, controlled/gi,
      "Professor Cera Lin rounded six-sided hexagon, controlled"
    )
    .replace(
      /Professor Cera Lin pointed pentagonal, composed, and precise/gi,
      "Professor Cera Lin rounded six-sided hexagon, composed, and precise"
    )
    .replace(
      /Professor Cera Lin pointed pentagonal/gi,
      "Professor Cera Lin rounded six-sided hexagon"
    )
    .replace(
      /Professor Cera Lin exact model sheet: pointed pentagonal silhouette/gi,
      "Professor Cera Lin exact model sheet: rounded six-sided hexagon silhouette"
    )
    .replace(
      /Professor Cera Lin exact model sheet identity: pointed pentagonal silhouette/gi,
      "Professor Cera Lin exact model sheet identity: rounded six-sided hexagon silhouette"
    )
    .replace(/precise pentagonal professor silhouette/gi, "precise rounded six-sided hexagon professor silhouette")
    .replace(/pointed pentagonal professor silhouette/gi, "rounded six-sided hexagon professor silhouette")
    .replace(/pointed pentagonal silhouette/gi, "rounded six-sided hexagon silhouette");
}

function trimImagePromptContext(value: string | null | undefined, maxLength: number) {
  return trimPromptContext(
    normalizeLegacyProfessorCeraLinShapeMentions(
      normalizeLegacyCoachRayShapeMentions(normalizeComicReferenceFileMentions(value))
    ),
    maxLength
  );
}

function buildComicPageUploadSummary(uploads: GeneratedComicPageUpload[]) {
  if (uploads.length === 0) {
    return "No required reference uploads were listed for this page.";
  }

  return uploads
    .map((upload) => {
      const uploadImageNames = upload.uploadImageNames.map(normalizeComicReferenceFileMentions);
      const relativePaths = upload.relativePaths.map(normalizeComicReferenceFileMentions);

      return [
        `- ${upload.label} (${upload.bucket})`,
        uploadImageNames.length > 0 ? `  Files: ${uploadImageNames.join(", ")}` : null,
        relativePaths.length > 0 ? `  Paths: ${relativePaths.join(", ")}` : null
      ].join("\n");
    })
    .join("\n\n");
}

function buildComicPageReferenceImageSummary(referenceImages: ComicReferenceImageFile[] = []) {
  if (referenceImages.length === 0) {
    return "No actual reference images were attached to this request.";
  }

  return referenceImages
    .map((reference, index) =>
      [
        `${index + 1}. ${reference.label} (${reference.bucket})`,
        `   File: ${reference.fileName}`,
        `   Path: ${reference.relativePath}`
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

  return [
    "Profile MD source of truth loaded from database. Use these as concise identity notes; the uploaded model-sheet images are the primary visual authority.",
    ...characterLocks.map((character) =>
      [
        `- ${character.name} (${character.slug}) Reference image files: ${
          character.referenceFiles.map((file) => file.fileName).join(", ") || "None"
        }.`,
        `  Short profile note: ${trimImagePromptContext(character.appearance, 95)}`
      ].join("\n")
    )
  ].join("\n");
}

function buildComicPageCharacterSeparationLocks(characters: ComicCharacterIdentityLock[] = []) {
  const slugs = new Set(characters.map((character) => character.slug));
  const locks: string[] = [];
  const characterHeightLock = buildComicCharacterHeightChartLock(Array.from(slugs));
  const similarTeardropLock = buildSimilarTeardropSeparationLock(Array.from(slugs));

  if (characterHeightLock) {
    locks.push(characterHeightLock);
  }

  if (similarTeardropLock) {
    locks.push(similarTeardropLock);
  }

  if (slugs.has("snacri")) {
    locks.push(
      [
        "Snacri eye expression lock:",
        "- Snacri's eyes must match the Snacri model sheet: two fully open round black dot eyes with tiny white highlights.",
        "- Never draw Snacri with half-lidded eyes, sleepy droopy eyes, eyelids, narrowed side-eye, angled angry eyes, brows, or tired marks. Do not draw Snacri with half-lidded eyes, sleepy droopy eyes. Her calm read comes from the right-leaning silhouette and tiny smile; never mirror her into Muci's left lean."
      ].join("\n")
    );
  }

  if (slugs.has("professor-cera-lin")) {
    locks.push(
      [
        "Professor Cera Lin six-sided hexagon shape lock:",
        "- Draw Professor Cera Lin from the Professor Cera Lin model sheet only: model-sheet rounded six-sided hexagon mascot with one rounded central top peak, two sloped upper sides, two vertical side walls, a rounded lower base, exactly six exterior sides and six rounded corners, clean controlled edges, balanced academic posture, large dot eyes, measured smile, upper reader-left glossy highlights, pure white body fill, and small connected feet.",
        "- Professor Cera Lin is not any star shape, not a five-point star, not a six-point star, not a pentagon, not a flat-topped stop-sign/octagon, not Sunny Spritz's soft five-point star, and not a generic polygon mascot. Do not add projecting star tips, concave notches, a flat top edge, or a sharp five-sided roof silhouette.",
        "- Before final render, count the exterior sides and rounded corners: if Professor Cera Lin reads as a star, five-sided, flat-topped, octagonal/stop-sign-like, or Sunny Spritz, redraw her as the single-top-peak rounded six-sided hexagon model-sheet character."
      ].join("\n")
    );
  }

  if (slugs.has("coach-ray")) {
    locks.push(
      [
        "Coach Ray anti-drift lock:",
        "- Draw Coach Ray from the Coach Ray model-sheet only: broad squat shield-shaped protective mascot, centered shallow top crest, firm upper shoulders, near-vertical sides, broad rounded lower body, controlled smile, planted stance, pure white body fill, and small connected feet.",
        "- Coach Ray is not Muci, not a teardrop/drop, not a pear, not a rounded blob, and not a generic polygon mascot. Do not borrow Muci's broad squat soft droplet outline or soft protagonist expression.",
        "- If the page prompt still contains legacy polygon wording for Coach Ray, ignore that wording and follow the shield-shaped Coach Ray lock instead."
      ].join("\n")
    );
  }

  if (slugs.has("coach-ray") && slugs.has("muci")) {
    locks.push(
      [
        "Muci vs Coach Ray separation:",
        "- Muci keeps the Muci model-sheet droplet exactly: broad squat body, round heavy lower half, natural rounded top point with a consistent reader-left/page-left lean, upper reader-left highlights, two attached feet, and a soft open protagonist expression. Never flip Muci into a right-leaning silhouette.",
        "- Coach Ray keeps the broad squat shield-shaped model-sheet silhouette with planted drill-instructor authority.",
        "- Do not average, merge, swap, or cross-contaminate their outlines, face placement, highlight marks, feet, or expressions."
      ].join("\n")
    );
  }

  return locks.length > 0 ? locks.join("\n\n") : "No extra character separation locks needed.";
}

function enforceComicImagePromptLength(prompt: string, preservedCurrentPageContext = "") {
  if (prompt.length <= OPENAI_COMIC_IMAGE_PROMPT_MAX_LENGTH) {
    return prompt;
  }

  const preservedContext = preservedCurrentPageContext
    ? [
        "",
        "Current-page content preserved after trimming. This section overrides episode summaries, character profile examples, and reference-image text:",
        trimImagePromptContext(preservedCurrentPageContext, 5200)
      ].join("\n")
    : "";
  const suffix = [
    "",
    "[Image prompt trimmed to stay under the OpenAI image prompt length limit.]",
    "The attached model-sheet images and the Profile MD identity locks already listed above remain binding.",
    preservedContext
  ].join("\n");
  const nextLength = OPENAI_COMIC_IMAGE_PROMPT_MAX_LENGTH - suffix.length;

  return `${prompt.slice(0, Math.max(0, nextLength)).trimEnd()}${suffix}`;
}

function enforceComicImageEditPromptLength(prompt: string, editInstruction: string) {
  if (prompt.length <= OPENAI_COMIC_IMAGE_PROMPT_MAX_LENGTH) {
    return prompt;
  }

  const suffix = [
    "",
    "[Edit prompt context trimmed to stay under the OpenAI image prompt length limit.]",
    "The attached source page, attached model-sheet references, and character identity locks remain binding.",
    "",
    "Admin edit request, preserved after trimming:",
    editInstruction.trim()
  ].join("\n");
  const nextLength = OPENAI_COMIC_IMAGE_PROMPT_MAX_LENGTH - suffix.length;

  return `${prompt.slice(0, Math.max(0, nextLength)).trimEnd()}${suffix}`;
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

function isComicCastComparisonReferenceImage(reference: ComicReferenceImageFile) {
  return (
    reference.bucket === "CAST_COMPARISON" ||
    reference.slug === "similar-teardrop-character-comparison" ||
    reference.relativePath === SIMILAR_TEARDROP_COMPARISON_REFERENCE.relativePath
  );
}

function isComicBrandLogoReferenceImage(reference: ComicReferenceImageFile) {
  return reference.bucket === "BRAND_LOGO";
}

function isComicPriorityPropReferenceImage(reference: ComicReferenceImageFile) {
  const searchable = [reference.label, reference.fileName, reference.relativePath, reference.slug]
    .join(" ")
    .toLowerCase();

  return (
    reference.bucket === "PRODUCT_LOCK" ||
    ((reference.bucket === "CHAPTER_SCENE" || reference.bucket === "DETECTED_CHAPTER_SCENE") &&
      (searchable.includes("student handbook") || searchable.includes("old handbook")))
  );
}

function isComicIdentityReferenceImage(reference: ComicReferenceImageFile) {
  return (
    isComicBrandLogoReferenceImage(reference) ||
    isComicCharacterReferenceImage(reference) ||
    isComicCastComparisonReferenceImage(reference) ||
    isComicPriorityPropReferenceImage(reference)
  );
}

function isComicPriorityReferenceImage(reference: ComicReferenceImageFile) {
  return (
    isComicBrandLogoReferenceImage(reference) ||
    isComicCastComparisonReferenceImage(reference) ||
    isComicPriorityPropReferenceImage(reference)
  );
}

function referenceIdentityKey(reference: ComicReferenceImageFile) {
  return reference.relativePath || `${reference.bucket}:${reference.slug}:${reference.fileName}`;
}

function includePriorityReferences(
  references: ComicReferenceImageFile[],
  limit: number,
  isPriorityReference: (reference: ComicReferenceImageFile) => boolean
) {
  const selected = references.slice(0, limit);
  const selectedKeys = new Set(selected.map(referenceIdentityKey));

  for (const priorityReference of references.filter(isPriorityReference)) {
    const priorityKey = referenceIdentityKey(priorityReference);

    if (selectedKeys.has(priorityKey)) {
      continue;
    }

    if (selected.length < limit) {
      selected.push(priorityReference);
      selectedKeys.add(priorityKey);
      continue;
    }

    const replaceIndex = selected.findLastIndex(
      (reference) => !isPriorityReference(reference)
    );

    if (replaceIndex < 0) {
      continue;
    }

    selectedKeys.delete(referenceIdentityKey(selected[replaceIndex]));
    selected[replaceIndex] = priorityReference;
    selectedKeys.add(priorityKey);
  }

  return selected;
}

function getOpenAiComicImageReferenceLimit() {
  const maxReferenceImages = Number.parseInt(process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES || "", 10);

  return Number.isFinite(maxReferenceImages) && maxReferenceImages > 0
    ? Math.min(Math.max(maxReferenceImages, 4), 16)
    : 8;
}

export function selectComicPageImageReferenceImages(
  references: ComicReferenceImageFile[],
  attempt: number
) {
  const referenceLimit = getOpenAiComicImageReferenceLimit();

  if (attempt <= 1) {
    return includePriorityReferences(
      references,
      referenceLimit,
      isComicPriorityReferenceImage
    );
  }

  const identityReferences = references.filter(isComicIdentityReferenceImage);
  const nonIdentityReferences = references.filter(
    (reference) => !isComicIdentityReferenceImage(reference)
  );

  if (identityReferences.length > 0) {
    const selected = includePriorityReferences(
      identityReferences,
      referenceLimit,
      isComicPriorityReferenceImage
    );

    if (attempt === 2 && selected.length < referenceLimit) {
      selected.push(...nonIdentityReferences.slice(0, referenceLimit - selected.length));
    }

    return selected;
  }

  return references.slice(0, Math.min(referenceLimit, 2));
}

function toStandaloneArrayBuffer(data: Uint8Array) {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}

async function prepareComicImageReferenceForEdit(
  image: ComicPageImageReferenceAsset,
  attempt: number
): Promise<PreparedComicImageInput> {
  const sourceBuffer = Buffer.from(image.base64Data, "base64");
  const prepared = await sharp(sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({
      width: getOpenAiComicImageEditSourceMaxWidth(),
      height: getOpenAiComicImageEditSourceMaxHeight(),
      fit: "inside",
      withoutEnlargement: true
    })
    .flatten({ background: "#ffffff" })
    .jpeg({
      quality: getOpenAiComicImageEditSourceQuality(attempt),
      mozjpeg: true
    })
    .toBuffer();

  return {
    mimeType: "image/jpeg",
    data: toStandaloneArrayBuffer(new Uint8Array(prepared)),
    fileName: image.fileName.replace(/\.[a-z0-9]+$/i, "") + "-edit-source.jpg"
  };
}

function selectComicPageEditReferenceImages(
  references: ComicReferenceImageFile[] = [],
  attempt: number
) {
  const selected = selectComicPageImageReferenceImages(references, attempt);

  if (attempt >= 3) {
    return includePriorityReferences(
      selected.filter(isComicIdentityReferenceImage),
      4,
      isComicCastComparisonReferenceImage
    );
  }

  return selected.slice(0, attempt >= 2 ? 4 : 6);
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
        ? "OpenAI is preparing this cover-plus-10-page prompt package."
        : "OpenAI is still generating this cover-plus-10-page prompt package."
  };
}

function assertOpenAiPromptPackageIsComplete(response: unknown) {
  const status = getOpenAiResponseStatus(response);

  if (["failed", "cancelled", "incomplete", "expired"].includes(status)) {
    throw new Error(getOpenAiResponseFailureMessage(response) || `OpenAI response ${status}.`);
  }
}

const COMIC_LOGO_PUBLIC_PATH = "/images/comiclogo.png";

function getPrimaryCoverReferenceFile(character: ComicCharacterContext) {
  return (
    character.referenceFiles.find((file) => /model|sheet|front|master/i.test(file.fileName)) ||
    character.referenceFiles[0] ||
    null
  );
}

function buildCoverCharacterUpload(
  character: ComicCharacterContext,
  whyThisMatters: string
): GeneratedComicPageUpload | null {
  const referenceFile = getPrimaryCoverReferenceFile(character);

  if (!referenceFile) {
    return null;
  }

  return {
    bucket: "CHARACTER",
    label: `${character.name} model sheet`,
    slug: character.slug,
    whyThisMatters,
    contentSummary: `${character.name} must stay visually identical to the uploaded model sheet on the episode cover.`,
    uploadImageNames: [referenceFile.fileName],
    relativePaths: [referenceFile.relativePath]
  };
}

function buildComicLogoUpload(): GeneratedComicPageUpload {
  return {
    bucket: "BRAND_LOGO",
    label: "Neatique comic title logo",
    slug: "comic-logo",
    whyThisMatters:
      "The cover must place the uploaded comic title logo at the top without redesigning it.",
    contentSummary:
      "Exact uploaded logo reference for the top title-logo area of the cover page.",
    uploadImageNames: ["comiclogo.png"],
    relativePaths: [COMIC_LOGO_PUBLIC_PATH]
  };
}

function getCoverCharacterUploads(
  input: GenerateComicPromptPackageInput,
  pages: GeneratedComicPagePrompt[]
) {
  const characterBySlug = new Map(input.characters.map((character) => [character.slug, character]));
  const characterScores = new Map<
    string,
    {
      upload: GeneratedComicPageUpload;
      count: number;
      firstPageNumber: number;
    }
  >();

  pages.forEach((page) => {
    page.requiredUploads
      .filter((upload) => upload.bucket === "CHARACTER")
      .forEach((upload) => {
        const existing = characterScores.get(upload.slug);

        characterScores.set(upload.slug, {
          upload,
          count: (existing?.count || 0) + 1,
          firstPageNumber: existing?.firstPageNumber ?? page.pageNumber
        });
      });
  });

  const rankedUploads = Array.from(characterScores.values())
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.firstPageNumber - right.firstPageNumber;
    })
    .map((entry) => {
      const character = characterBySlug.get(entry.upload.slug);
      return character
        ? buildCoverCharacterUpload(
            character,
            `${character.name} is one of the episode's main recurring cover characters.`
          ) || entry.upload
        : entry.upload;
    })
    .slice(0, 4);

  if (rankedUploads.length > 0) {
    return rankedUploads;
  }

  return input.characters
    .slice(0, 4)
    .map((character) =>
      buildCoverCharacterUpload(
        character,
        `${character.name} is available as a locked character reference for the episode cover.`
      )
    )
    .filter(Boolean) as GeneratedComicPageUpload[];
}

function getCoverCharacterNames(characterUploads: GeneratedComicPageUpload[]) {
  const names = characterUploads
    .filter((upload) => upload.bucket === "CHARACTER")
    .map((upload) => upload.label.replace(/\s+model sheet$/i, "").trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

function formatComicCoverEpisodeTitle(episode: ComicEpisodeContext) {
  return typeof episode.episodeNumber === "number" && Number.isFinite(episode.episodeNumber)
    ? `Episode ${episode.episodeNumber}: ${episode.title}`
    : `Episode: ${episode.title}`;
}

function buildComicCoverPagePrompt(input: {
  packageInput: GenerateComicPromptPackageInput;
  pages: GeneratedComicPagePrompt[];
  episodeLogline: string;
  episodeSynopsis: string;
}) {
  const characterUploads = getCoverCharacterUploads(input.packageInput, input.pages);
  const characterNames = getCoverCharacterNames(characterUploads);
  const characterLabel =
    characterNames.length > 0 ? characterNames.join(", ") : "the episode's main characters";
  const coverTitle = formatComicCoverEpisodeTitle(input.packageInput.episode);
  const firstStoryBeats = input.pages
    .slice(0, 3)
    .map((page) => `${formatComicPageLabel(page.pageNumber)}: ${page.pagePurpose}`)
    .join("\n");
  const coverInteraction = [
    `Inside the large framed cover illustration, show ${characterLabel} caught in one memorable silent interaction that previews this episode through expression, body language, and prop motion.`,
    `Invent a cover-only visual hook from the episode logline and synopsis; do not merely copy a normal story panel: ${input.episodeLogline} ${input.episodeSynopsis}`,
    firstStoryBeats
      ? `Use these early page beats as staging clues, then remix them into one playful cover moment:\n${firstStoryBeats}`
      : null,
    COMIC_COVER_INTERACTION_DESIGN_LOCKS,
    "Do not copy any character first-appearance introduction box, name card, role card, profile box, or bio label from those early story beats. The cover does not count as a character's first appearance.",
    "The interaction should feel like a polished manga cover moment, not a normal multi-panel page: big readable silhouettes, expressive eye contact, telekinetic object movement where action would require hands, and strong negative space."
  ]
    .filter(Boolean)
    .join("\n");
  const promptPackCopyText = [
    "Create the episode cover page for Neatique's original comic series.",
    "Cover layout, top to bottom:",
    `1. Top logo area: place the exact uploaded comic title logo from ${COMIC_LOGO_PUBLIC_PATH}, centered, copied from the reference image, not redesigned, in the same position and size as Episode 1's cover.`,
    `2. Under the logo, render one centered serif title line exactly: "${coverTitle}", in the same position as Episode 1's Episode title line.`,
    "3. Under the serif title line, draw one large clean rectangular manga frame with a strong black border. Match Episode 1's cover frame size and position exactly.",
    `4. Inside that large frame: ${coverInteraction}`,
    "",
    COMIC_COVER_EPISODE_ONE_LAYOUT_LOCKS,
    "",
    COMIC_COVER_INTERACTION_DESIGN_LOCKS,
    "",
    "Visible cover text:",
    `Serif title line: "${coverTitle}"`,
    "",
    COMIC_COVER_TYPOGRAPHY_LOCKS,
    "",
    "Style and production locks:",
    "Maintain the unified minimalist Japanese manga style used by the whole comic: clean high-contrast black ink on white, elegant negative space, simple readable silhouettes, restrained detail, pure white character bodies, exact model-sheet silhouettes, visible connected feet, and handless/armless mascot anatomy. If a character has no expressive role in the cover hook, omit them instead of adding a static bystander. Do not add dialogue, speech balloons, caption boxes, SFX, character introduction boxes, name cards, role cards, profile boxes, extra logos, watermarks, product labels, signatures, or unrelated text."
  ].join("\n");
  const referenceNotesCopyText = ensureReferenceNotesIncludeLettering(
    [
      "Cover page reference notes:",
      `- Upload and attach ${COMIC_LOGO_PUBLIC_PATH} as the exact title-logo reference. Copy the logo shape faithfully at the top of the cover.`,
      "- Upload the listed character model sheets for all cover characters. Character model sheets are exact identity locks, not loose inspiration.",
      "- Read each character Profile MD lock together with the uploaded model sheet before drawing that character.",
      `- Render the title line exactly as "${coverTitle}" in one unified serif typeface.`,
      "- Match Episode 1's cover layout exactly: same logo position/size, same Episode title position, and same lower rectangular frame size/position.",
      "- The cover uses one large framed illustration, not multiple story panels.",
      "- The lower cover frame must be a specific expressive interaction with a playful or emotionally charged visual hook, not a static lineup or simple character-and-background pose.",
      "- Every visible cover character needs a distinct silent expression or reaction that supports the hook.",
      "- Use episode-relevant telekinetic prop movement, eye-lines, body tilts, and motion lines to make the interaction readable without dialogue.",
      "- Do not include character dialogue, speech balloons, caption boxes, or SFX.",
      "- Do not include character first-appearance introduction boxes, name cards, role cards, profile boxes, or cast bio labels. The cover does not count as any character's first appearance.",
      "- Keep the same unified minimalist Japanese black-and-white manga style as the whole comic."
    ].join("\n")
  );

  return {
    pageNumber: COMIC_COVER_PAGE_NUMBER,
    panelCount: 1,
    pagePurpose: `Cover: logo, ${coverTitle}, and an expressive silent visual hook between the main characters.`,
    promptPackCopyText,
    referenceNotesCopyText,
    panels: [
      {
        pageNumber: COMIC_COVER_PAGE_NUMBER,
        panelNumber: 1,
        panelTitle: "Expressive cover visual hook",
        storyBeat: coverInteraction,
        promptText:
          `Draw the cover's lower large frame as a polished minimalist Japanese manga illustration built around one specific silent visual hook: expressive reactions, asymmetric eye-lines, body tilts, and episode-relevant telekinetic prop motion. Do not draw a static lineup or simple character-and-background pose. Keep the logo/title stack and lower rectangle frame in the same positions and sizes as Episode 1's cover. Render the exact serif title line "${coverTitle}". Do not include dialogue, speech balloons, caption boxes, SFX, character introduction boxes, name cards, role cards, or profile boxes.`,
        dialogueLines: []
      }
    ],
    requiredUploads: [buildComicLogoUpload(), ...characterUploads]
  } satisfies GeneratedComicPagePrompt;
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

function buildComicPagePanelSummary(
  panels: GeneratedComicPanelPrompt[],
  options: { coverPage?: boolean } = {}
) {
  if (panels.length === 0) {
    return "No panel beats were listed for this page.";
  }

  return panels
    .map((panel) => {
      const lines = [
        `Panel ${panel.panelNumber}: ${panel.panelTitle}`,
        `Story beat: ${trimImagePromptContext(panel.storyBeat, 360)}`,
        `Panel image direction: ${trimImagePromptContext(panel.promptText || "Use the page prompt and story beat.", 360)}`
      ];

      if (options.coverPage) {
        lines.splice(
          2,
          0,
          "Cover text rule: no character dialogue, no speech balloons, no caption boxes, and no SFX."
        );
      } else {
        lines.splice(
          2,
          0,
          `Dialogue lines:\n${formatComicDialogueLines(panel.dialogueLines || [])}`
        );
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function buildComicPageVisibleTextWhitelist(
  panels: GeneratedComicPanelPrompt[],
  options: { coverPage?: boolean } = {}
) {
  if (options.coverPage) {
    return [
      "Visible text whitelist for this page:",
      "- Cover page only: the uploaded logo and the exact serif episode title from the cover prompt.",
      "- Do not add speech balloons, captions, SFX, profile cards, name cards, role cards, cast bio labels, or random readable text."
    ].join("\n");
  }

  const dialogueLines = panels.flatMap((panel) =>
    (panel.dialogueLines || []).map((line) => ({
      panelNumber: panel.panelNumber,
      speaker: line.speaker,
      text: line.text
    }))
  );

  const exactLines =
    dialogueLines.length > 0
      ? dialogueLines
          .map((line) => `- Panel ${line.panelNumber} ${line.speaker}: "${line.text}"`)
          .join("\n")
      : "- No speech/caption dialogue lines are allowed.";

  return [
    "Visible text whitelist for this page:",
    exactLines,
    "- Do not render any other readable English text, character bio, title card, profile card, name card, role card, cast label, or caption unless the panel image direction explicitly names the exact visible word.",
    "- Text printed inside attached model sheets, character profiles, reference images, and episode summaries is reference-only; never copy it into story panels."
  ].join("\n");
}

function getComicImagePageLabel(input: Pick<GenerateComicPageImageInput, "pageNumber" | "pageLabel">) {
  return input.pageLabel?.trim() || formatComicPageLabel(input.pageNumber);
}

function buildComicPageCriticalContent(
  input: GenerateComicPageImageInput,
  options: { coverPage?: boolean } = {}
) {
  const pageLabel = getComicImagePageLabel(input);

  return [
    "CURRENT PAGE CONTENT - HIGHEST PRIORITY:",
    `Draw ${pageLabel} only, not any other page from the episode.`,
    `Current page purpose: ${trimImagePromptContext(input.pagePurpose, 320)}`,
    options.coverPage
      ? "Cover content overrides all character-reference text. Do not draw story-page intro/profile/name cards."
      : "Current panel plan and visible-text whitelist override episode summary, character profile text, reference image labels, and prior-page intro cards.",
    options.coverPage
      ? null
      : "Only draw a character intro/name/profile card if its exact visible card text is listed in the whitelist or panel plan below. Otherwise do not draw any intro card.",
    buildComicPageVisibleTextWhitelist(input.panels, options),
    "",
    "Panel-by-panel content to illustrate:",
    buildComicPagePanelSummary(input.panels, options)
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildComicPageImagePrompt(input: GenerateComicPageImageInput) {
  const isCoverPage = isComicCoverPageNumber(input.pageNumber);
  const pageLabel = getComicImagePageLabel(input);
  const currentPageCriticalContent = buildComicPageCriticalContent(input, {
    coverPage: isCoverPage
  });
  const prompt = [
    "Create one finished vertical comic page for Neatique's original comic series.",
    COMIC_IMAGE_PRODUCTION_LOCKS,
    "",
    "Canvas and layout requirements:",
    "- Aspect ratio must be 2:3 vertical.",
    `- The page must contain exactly ${input.panelCount} panel${input.panelCount === 1 ? "" : "s"}.`,
    "- Use clear manga/webcomic page composition with clean panel gutters.",
    "- Keep the page suitable for a polished brand comic, not a rough storyboard.",
    "- Attached reference images are binding visual references; copy model-sheet silhouettes, proportions, face placement, body fill, and feet.",
    isCoverPage ? COMIC_COVER_EPISODE_ONE_LAYOUT_LOCKS : null,
    "- Only draw the characters named in the panel plan or dialogue for this page. Do not add background mascots just because their references are available.",
    "- Do not blend silhouettes, faces, highlights, feet, expressions, or body proportions across characters.",
    "- Foot check: full-body characters show connected small feet with clear lower-frame space; no cropped feet or hard shoe/seam lines.",
    "- Sunny Spritz check: if Sunny appears full-body, show two small rounded feet directly under the soft five-point star body.",
    isCoverPage
      ? "- Cover mouth-state check: because the cover has no dialogue, do not stage any character as speaking. Keep mouths closed, tiny neutral, or silently expressive without speech balloons."
      : "- Mouth state check: draw closed mouths for characters who are not speaking in that panel; only the active speaker or explicit vocal reaction may have an open mouth.",
    isCoverPage
      ? "- Cover interaction rule: the lower frame must not be a static lineup or simple character-and-background pose. Make one readable silent visual hook with distinct expressions, eye-lines, body tilts, and telekinetic prop motion."
      : null,
    isCoverPage
      ? "- Cover acting rule: every visible main character must have a clear role in the silent interaction. Omit characters who would only stand neutrally as background bystanders."
      : null,
    isCoverPage
      ? "- Cover text rule: render only the uploaded logo and the exact serif title line specified in the cover prompt. Do not add dialogue, speech balloons, caption boxes, or SFX."
      : "- Render every specified dialogue line, caption, and SFX from the panel plan. Do not omit dialogue balloons.",
    isCoverPage
      ? "- Cover first-appearance rule: the cover does not count as a character's first appearance. Do not draw character introduction boxes, name cards, role cards, profile boxes, or cast bio labels on the cover."
      : "- Story intro-card rule: only draw a character introduction box, name card, role card, or profile box when the current page's panel plan or dialogue explicitly lists that exact visible text. Never infer intro cards from attached character references or repeat a character's intro on later pages.",
    isCoverPage ? COMIC_COVER_TYPOGRAPHY_LOCKS : COMIC_LETTERING_STYLE_LOCKS,
    "",
    getComicPageImageAttemptGuide(input),
    "",
    currentPageCriticalContent,
    "",
    "Story context:",
    `Project: ${input.projectTitle}`,
    `Season: ${input.seasonTitle}`,
    `Chapter: ${input.chapterTitle}`,
    `Episode: ${input.episodeTitle}`,
    isCoverPage
      ? `Episode summary for continuity only, not visible page text: ${trimImagePromptContext(input.episodeSummary, 420)}`
      : "Episode summary for continuity only: omitted for story-page image generation so other-page intro cards or events cannot leak into this page. Follow the current page purpose, visible-text whitelist, and panel plan only.",
    `${pageLabel} purpose: ${trimImagePromptContext(input.pagePurpose, 360)}`,
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
    "Character separation and anti-blend locks:",
    buildComicPageCharacterSeparationLocks(input.characterLocks),
    "",
    "Product locks for this page:",
    buildProductLockSummary(input.productLocks),
    "",
    "Production prompt already prepared for this page:",
    trimImagePromptContext(input.promptPackCopyText, 2200),
    "",
    input.globalGptImage2Notes
      ? `Global gpt-image-2 continuity notes:\n${trimImagePromptContext(input.globalGptImage2Notes, 700)}`
      : "Global gpt-image-2 continuity notes: none stored.",
    "",
    input.referenceNotesCopyText
      ? `Page-specific reference notes:\n${trimImagePromptContext(input.referenceNotesCopyText, 700)}`
      : "Page-specific reference notes: none stored.",
    "",
    "Final output: one complete 2:3 comic page image, not separate files."
  ].join("\n");

  return enforceComicImagePromptLength(prompt, currentPageCriticalContent);
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
    "OpenAI comic page image reference edit",
    imageQuality
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

export async function generateStandaloneComicImageWithAi(
  input: GenerateStandaloneComicImageInput
): Promise<GeneratedComicPageImageAsset> {
  const imageApiSettings = getComicImageApiSettings();

  if (!imageApiSettings.apiKey) {
    throw new Error("Comic image API key is not configured.");
  }

  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error("Image prompt is required.");
  }

  const attempt = Math.max(input.generationAttempt || 1, 1);
  const imageQuality = getStandaloneComicImageQuality(input.quality, attempt);
  const outputFormat = getOpenAiComicImageOutputFormat();
  const outputMimeType = getOpenAiComicImageMimeType(outputFormat);
  const referenceImages = getStandaloneReferenceImages(input);
  const standalonePrompt = [
    prompt,
    "",
    referenceImages.length > 0
      ? `Use the ${referenceImages.length} supplied reference image${referenceImages.length === 1 ? "" : "s"} as visual starting points and style/content references. Follow the user's prompt for what to preserve, combine, change, add, or remove.`
      : null,
    `Canvas aspect ratio: ${parseStandaloneAspectRatio(input.aspectRatio).label}.`,
    getStandaloneComicImageQualityGuide(imageQuality),
    "Follow the user's prompt closely. Do not add watermarks, signatures, UI chrome, or unrelated text."
  ]
    .filter(Boolean)
    .join("\n");

  if (referenceImages.length > 0) {
    const normalizedReferenceImages = await Promise.all(
      referenceImages.map((referenceImage) => normalizeStandaloneReferenceImageForAi(referenceImage))
    );
    const formData = new FormData();
    formData.append("model", DEFAULT_OPENAI_COMIC_IMAGE_MODEL);
    formData.append("prompt", standalonePrompt);
    formData.append("size", getStandaloneComicImageApiSize(input.aspectRatio));
    formData.append("quality", imageQuality);
    if (outputFormat) {
      formData.append("output_format", outputFormat);
    }
    if (outputFormat !== "png") {
      formData.append("output_compression", String(getOpenAiComicImageOutputCompression()));
    }
    formData.append("n", "1");

    for (const referenceImage of normalizedReferenceImages) {
      const referenceBuffer = Buffer.from(referenceImage.base64Data, "base64");
      formData.append(
        normalizedReferenceImages.length === 1 ? "image" : "image[]",
        new Blob([new Uint8Array(referenceBuffer)], { type: referenceImage.mimeType }),
        referenceImage.fileName
      );
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
      "OpenAI comic image reference creation",
      imageQuality
    );

    const rawText = await response.text();
    const parsed = rawText ? safeJsonParse(rawText) : null;

    if (!response.ok) {
      const parsedRecord =
        parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      const message =
        (parsedRecord && "error" in parsedRecord
          ? extractOpenAiErrorMessage(parsedRecord.error)
          : null) || `OpenAI comic image reference creation failed with ${response.status}.`;
      throw new Error(message);
    }

    const data =
      parsed && typeof parsed === "object" && Array.isArray((parsed as any).data)
        ? (parsed as any).data
        : [];
    const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";
    const imageUrl = typeof data?.[0]?.url === "string" ? data[0].url.trim() : "";
    const generatedImage = base64Data
      ? parseImageBase64Response(base64Data, outputMimeType)
      : imageUrl
        ? await fetchImageUrlAsBase64(imageUrl)
        : null;

    if (!generatedImage) {
      throw new Error("Comic image API did not return a reference-guided image.");
    }

    return cropStandaloneComicImageToAspectRatio(generatedImage, input.aspectRatio);
  }

  const body: Record<string, unknown> = {
    model: DEFAULT_OPENAI_COMIC_IMAGE_MODEL,
    prompt: standalonePrompt,
    size: getStandaloneComicImageApiSize(input.aspectRatio),
    quality: imageQuality,
    n: 1
  };

  if (outputFormat) {
    body.output_format = outputFormat;
  }

  if (outputFormat !== "png") {
    body.output_compression = getOpenAiComicImageOutputCompression();
  }

  const response = await fetchOpenAiComicImageResponse(
    `${imageApiSettings.baseUrl}/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageApiSettings.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    },
    "OpenAI comic image creation",
    imageQuality
  );

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI comic image creation failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";
  const imageUrl = typeof data?.[0]?.url === "string" ? data[0].url.trim() : "";
  const generatedImage = base64Data
    ? parseImageBase64Response(base64Data, outputMimeType)
    : imageUrl
      ? await fetchImageUrlAsBase64(imageUrl)
      : null;

  if (!generatedImage) {
    throw new Error("Comic image API did not return an image.");
  }

  return cropStandaloneComicImageToAspectRatio(generatedImage, input.aspectRatio);
}

export async function generateChineseComicPageVersionWithAi(input: {
  sourceImage: ComicPageImageReferenceAsset;
  pageNumber: number;
  episodeTitle: string;
  characterNameLocks?: ComicCharacterChineseNameLock[];
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
      formatComicCharacterChineseNameLocks(input.characterNameLocks),
      "If an English character name appears in the original page and a Chinese name is listed above, replace it with that exact Chinese name.",
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
  pageContext?: ComicPageImageEditPageContext | null;
  referenceImages?: ComicReferenceImageFile[];
  characterLocks?: ComicCharacterIdentityLock[];
  productLocks?: ComicProductLockContext[];
  attempt?: number;
}): Promise<GeneratedComicPageImageAsset> {
  const imageApiSettings = getComicImageApiSettings();

  if (!imageApiSettings.apiKey) {
    throw new Error("Comic image API key is not configured.");
  }

  const editInstruction = input.editInstruction.trim();

  if (!editInstruction) {
    throw new Error("Comic page edit instruction is required.");
  }

  const attempt = Math.max(input.attempt || 1, 1);
  const sourceImage = await prepareComicImageReferenceForEdit(input.sourceImage, attempt);
  const referenceImages = selectComicPageEditReferenceImages(input.referenceImages || [], attempt);
  const imageQuality = getOpenAiComicImageEditQuality();
  const formData = new FormData();
  formData.append("model", DEFAULT_OPENAI_COMIC_IMAGE_MODEL);
  const editPrompt = [
      "Edit the supplied finished comic page using it as the primary reference image.",
      "The first attached image is the source page to edit. Additional attached images are identity/continuity references and must be used as exact locks, not loose inspiration.",
      "The following global comic production locks remain mandatory during edits. They override any accidental drift in the source image, attached references, or edit request:",
      COMIC_IMAGE_PRODUCTION_LOCKS,
      COMIC_LETTERING_STYLE_LOCKS,
      "",
      "Edit-specific constraints:",
      "Make only the requested local/simple change. Preserve the existing page as much as possible.",
      "Keep the same panel layout, page size, camera angles, composition, gutters, character identities, character proportions, facial expressions, clean black-and-white manga linework, pure white mascot body fills, and readable page rhythm.",
      "Do not regenerate the page from scratch. Do not add new panels, extra characters, random props, watermarks, signatures, logos, or unrelated text.",
      "Keep all characters handless and armless. Preserve visible small rounded feet or foot nubs in any full-body character view. Do not crop, flatten, hide, remove, or separate the feet from the body with hard dividing lines while editing.",
      "When Muci is visible, correct him to the Muci model sheet: broad squat pure-white droplet, round heavy lower half, natural rounded top point with a consistent lean toward reader-left/Muci's right, no brow, upper reader-left highlights, and two attached small feet. Do not let him become tall, vertical-pointed, sharp, Nia-like, Snacri-right-leaning, or over-leaned into a hook/curl.",
      "If the edit request affects text, keep the wording short and fitted to the original balloon/sign space.",
      "If the edit request conflicts with the locked comic style or character model consistency, make the closest safe edit while preserving the original character/page identity.",
      "",
      getComicPageImageAttemptGuide({
        projectTitle: "",
        seasonTitle: "",
        chapterTitle: "",
        episodeTitle: input.episodeTitle,
        episodeSummary: "",
        pageNumber: input.pageNumber,
        panelCount: input.pageContext?.panels?.length || 1,
        pagePurpose: input.pageContext?.pagePurpose || "",
        promptPackCopyText: input.pageContext?.promptPackCopyText || "",
        referenceNotesCopyText: input.pageContext?.referenceNotesCopyText || "",
        globalGptImage2Notes: null,
        panels: input.pageContext?.panels || [],
        requiredUploads: [],
        referenceImages,
        characterLocks: input.characterLocks || [],
        productLocks: input.productLocks || [],
        generationAttempt: attempt
      }),
      "",
      "Actual reference images attached after the source page:",
      buildComicPageReferenceImageSummary(referenceImages),
      "",
      "Character Profile MD identity locks loaded for this page:",
      buildComicPageCharacterIdentityLockSummary(input.characterLocks || []),
      "",
      "Character separation and anti-blend locks:",
      buildComicPageCharacterSeparationLocks(input.characterLocks || []),
      "",
      "Product locks for this edit:",
      buildProductLockSummary(input.productLocks || []),
      input.pageContext?.pagePurpose
        ? `Stored page purpose: ${trimImagePromptContext(input.pageContext.pagePurpose, 320)}`
        : null,
      input.pageContext?.panels?.length
        ? `Stored panel/dialogue plan:\n${buildComicPagePanelSummary(input.pageContext.panels)}`
        : null,
      input.pageContext?.promptPackCopyText
        ? `Stored page prompt:\n${trimImagePromptContext(input.pageContext.promptPackCopyText, 900)}`
        : null,
      input.pageContext?.referenceNotesCopyText
        ? `Stored reference notes:\n${trimImagePromptContext(input.pageContext.referenceNotesCopyText, 500)}`
        : null,
      `Episode: ${input.episodeTitle}`,
      `Page: ${input.pageNumber}`,
      "",
      "Admin edit request:",
      editInstruction
    ]
      .filter(Boolean)
      .join("\n");
  formData.append("prompt", enforceComicImageEditPromptLength(editPrompt, editInstruction));
  formData.append("size", "1024x1536");
  formData.append("quality", imageQuality);
  const outputFormat = getOpenAiComicImageOutputFormat();
  formData.append("output_format", outputFormat);
  if (outputFormat !== "png") {
    formData.append("output_compression", String(getOpenAiComicImageOutputCompression()));
  }
  const inputFidelity = getOpenAiComicImageInputFidelity(attempt);
  if (inputFidelity) {
    formData.append("input_fidelity", inputFidelity);
  }

  formData.append("image[]", new Blob([sourceImage.data], { type: sourceImage.mimeType }), sourceImage.fileName);

  for (const referenceImage of referenceImages) {
    formData.append(
      "image[]",
      new Blob([new Uint8Array(referenceImage.data)], { type: referenceImage.mimeType }),
      referenceImage.fileName
    );
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

  const isCoverPage = isComicCoverPageNumber(input.pageNumber);
  const allowedPanelCounts = isCoverPage ? [1] : [2, 3];
  const minPanelCount = isCoverPage ? 1 : 2;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      pageNumber: { type: "integer", minimum: input.pageNumber, maximum: input.pageNumber },
      panelCount: { type: "integer", enum: allowedPanelCounts },
      pagePurpose: { type: "string", minLength: 12, maxLength: 520 },
      promptPackCopyText: { type: "string", minLength: 180, maxLength: 4200 },
      referenceNotesCopyText: { type: "string", minLength: 120, maxLength: 2200 },
      panels: {
        type: "array",
        minItems: minPanelCount,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            panelNumber: { type: "integer", minimum: 1, maximum: 3 },
            panelTitle: { type: "string", minLength: 4, maxLength: 140 },
            storyBeat: { type: "string", minLength: 12, maxLength: 900 },
            promptText: { type: "string", minLength: 60, maxLength: 720 },
            dialogueLines: {
              type: "array",
              minItems: isCoverPage ? 0 : 1,
              maxItems: isCoverPage ? 0 : 4,
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
                input.pageLabel
                  ? `Treat the visible/admin page label as "${input.pageLabel}". The numeric pageNumber is only an internal schema value.`
                  : null,
                "Keep the page production-ready for gpt-image-2.",
                "Keep the revised prompt concise and production-ready. Do not repeat long global locks; rely on requiredUploads, attached model sheets, and short high-risk reminders.",
                "Preserve the existing story continuity unless the suggestion explicitly asks for a composition change.",
                "Do not remove required character or scene continuity details.",
                isCoverPage
                  ? "This is a cover page. It must not include character dialogue, speech balloons, caption boxes, or SFX; return dialogueLines as an empty array."
                  : "Every revised panel must include dialogueLines with exact visible dialogue text, plus promptText that explains where balloons/captions/SFX go.",
                isCoverPage
                  ? "The revised promptPackCopyText must include the exact serif cover title line and must explicitly say there is no dialogue on the cover."
                  : "The revised promptPackCopyText must include a Dialogue and lettering plan section with every dialogue line exactly as it should appear on the page.",
                "All revised prompt text must follow these compact production locks without pasting them repeatedly:",
                COMIC_IMAGE_PRODUCTION_LOCKS,
                isCoverPage ? COMIC_COVER_TYPOGRAPHY_LOCKS : COMIC_LETTERING_STYLE_LOCKS,
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
                    pageLabel: input.pageLabel || formatComicPageLabel(input.pageNumber),
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
                isCoverPage
                  ? "- Keep panelCount at 1. This is the single large framed cover interaction."
                  : "- Keep panelCount at 2 or 3.",
                isCoverPage
                  ? "- Preserve Episode 1's cover layout template: same logo position/size, same Episode title position, and same lower rectangular frame size/position."
                  : null,
                "- Improve pagePurpose, promptPackCopyText, referenceNotesCopyText, and panel story beats to reflect the suggestion.",
                "- Keep the full page content, all panels, all important reference instructions, and the final visual locks, but do not repeat the same character lock in every field.",
                isCoverPage
                  ? "- Keep the cover dialogue-free. Return dialogueLines as an empty array and do not mention speech balloons, caption boxes, or SFX as visible cover elements."
                  : "- Keep or improve the visible dialogue for every panel. Do not remove all dialogue from the page.",
                isCoverPage
                  ? "- The cover does not count as any character's first appearance. Do not add character introduction boxes, name cards, role cards, profile boxes, or cast bio labels."
                  : "- Only keep a character introduction box, name card, role card, or profile box when the stored page plan explicitly includes that exact visible text. Never infer or repeat intro cards from attached character references.",
                isCoverPage
                  ? "- Keep one unified serif typeface for the exact cover title line."
                  : "- Every panel must return dialogueLines with exact speaker names and exact text to render in balloons or captions.",
                isCoverPage
                  ? "- The promptPackCopyText must include the exact cover title line and must tell gpt-image-2 to render it in a consistent serif font."
                  : "- The promptPackCopyText must include those exact dialogue lines and must tell gpt-image-2 to render them in consistent clean manga lettering.",
                "- Keep character model-sheet identity locked.",
                "- Make sure every full-body character keeps visible small rounded feet or foot nubs with the lower frame edge below the feet.",
                "- Keep the feet connected to the body as one continuous mascot form; do not add a hard horizontal dividing line, shoe line, or solid seam between body and feet.",
                "- If Sunny Spritz appears, explicitly preserve two small rounded feet directly under her soft five-point star body.",
                "- Keep all characters handless and armless; use telekinesis for object interaction.",
                "- Keep clean high-contrast black-and-white manga style, pure white character bodies, and no gray wash.",
                isCoverPage
                  ? "- Use one consistent serif font for cover text and maintain the unified minimalist Japanese manga style."
                  : "- Use one consistent rounded manga lettering style across speech balloons, captions, and SFX."
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
            (isCoverPage || panel.dialogueLines.length > 0)
        )
    : [];

  if (panels.length < minPanelCount) {
    throw new Error("OpenAI returned too few revised panel beats.");
  }

  const normalizedPanels = panels.slice(0, 3).map((panel, index) => ({
    ...panel,
    pageNumber: input.pageNumber,
    panelNumber: index + 1
  }));
  const promptPackCopyText =
    typeof record.promptPackCopyText === "string" && record.promptPackCopyText.trim()
      ? isCoverPage
        ? record.promptPackCopyText.trim()
        : ensurePromptIncludesDialogueAndLettering(record.promptPackCopyText, normalizedPanels)
      : isCoverPage
        ? input.promptPackCopyText.trim()
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
            promptPackCopyText: { type: "string", minLength: 160, maxLength: 2600 },
            referenceNotesCopyText: { type: "string", minLength: 120, maxLength: 1600 },
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
                "For character consistency, rely first on each required model-sheet file. In page prompts, add only compact high-risk reminders for active characters instead of repeating full identity paragraphs.",
                "Use these short reminders only when relevant: Muci broad squat/no brow/consistent left lean; Nia taller sharp/one angled brow; Snacri right-leaning with fully open round eyes and tiny smile; Padaruna sharp centered point and chubby body/no side nubs/no brows; Padarana upright soft point/closed eyes; Professor Cera Lin rounded six-sided hexagon; Coach Ray broad shield-shaped mascot.",
                "When similar droplet characters share a page, include one compact separation note plus the comparison reference. When height-locked characters share a page, mention height tiers only as invisible production guidance and never as a visible chart, lineup, label set, diagram, or story action.",
                "Character introduction boxes are one-time story devices. Include an intro/name card only on the page where the story deliberately introduces that character, then explicitly avoid repeating that intro/name card on later pages.",
                "Never invent arms, hands, fingers, gloves, sleeves, humanoid bodies, animal paws, or redesigned mascot silhouettes.",
                "You must think like a comic production assistant, not like a novelist only.",
                "Return only valid JSON matching the schema.",
                "Build exactly 10 story pages for every episode. The application prepends a generated Cover page prompt as page 0.",
                "The generated Cover page does not count as any character's first appearance. Character first-appearance introduction boxes, name cards, role cards, profile boxes, or cast bio labels must only be planned on story pages 1-10.",
                "Use 3 panels per page by default. Only use 2 panels when the story beat deserves extra visual space, such as a reveal, pause, emotional beat, or dramatic transition.",
                "Every page must include a prompt block that is ready to copy and paste directly into gpt-image-2 after the right references are uploaded.",
                "Every page must also include a reference-notes block that is ready to copy and paste directly into the image workflow without cleanup.",
                "When you build the upload checklist, explicitly state which character reference images, reusable scene reference images, and chapter scene reference images should be uploaded before using gpt-image-2.",
                "If a named prop or object appears on multiple pages, treat it like a continuity asset: use an existing chapter scene reference if one exists, or explicitly flag that a prop/object reference should be created before image generation.",
                "When a recurring prop reference exists in the chapter scene reference files, include it in requiredUploads on every page where that prop appears.",
                "When the old student handbook, Student Handbook (old edition), or old handbook appears, use the chapter prop reference named Student Handbook (old edition).jpg if it exists; match its approved Episode 4 Page 10 design exactly, and never substitute the Sunscreen Field Handbook.jpg design.",
                "When product locks are provided, treat them as binding prop identity locks. Render a simple clean product bottle with only the large locked short code on the front label, no small packaging text or product claims.",
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
                "Global visual production locks for this package. Follow these rules, but do not paste them verbatim into every page; page prompts should use the attached model sheets plus short high-risk reminders:",
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
                "Locked product library for product-use extra stories:",
                buildProductLockSummary(input.productLocks),
                "",
                "Chapter-specific scene reference files:",
                buildChapterSceneReferenceSummary(input.chapterSceneReferences),
                "",
                "Output requirements:",
                "- Write the entire returned JSON content in English, even if the stored outlines are Chinese.",
                "- Keep every character name in English exactly as provided.",
                "- Expand the episode into a readable production script.",
                "- The episodeScript must include dialogue, not only prose narration.",
                "- Create a 10-story-page plan. Do not include the cover in the returned pages array; the application prepends the cover page prompt as pageNumber 0.",
                "- If a named character needs a first-appearance introduction box, put it on that character's first story page appearance within pages 1-10. Never reserve it for the cover, and never treat the cover as the first appearance.",
                "- If the episode mentions a locked product, use the matching product lock. The product should appear as a clean manga bottle whose front label shows only the large short code, such as SE96, with no small text.",
                "- Keep every returned field compact enough for a production dashboard; avoid repeating the same global locks verbatim inside every field.",
                "- Keep promptPackCopyText concise: rely on requiredUploads and attached model sheets for character consistency, then add only the page-specific action, prop, dialogue, and one-line high-risk identity reminders.",
                "- Every page should normally contain 3 panels.",
                "- A page may contain 2 panels only when the beat is visually important enough to justify extra space.",
                `- Assume the image generation step will use ${DEFAULT_OPENAI_COMIC_IMAGE_MODEL}.`,
                "- Every panel must include 1 to 4 dialogueLines with exact visible text. Use a character name as speaker for speech, or Caption/SFX only when a panel truly needs non-spoken text.",
                "- Each dialogue line should be short, natural, and renderable inside a speech balloon or caption box.",
                "- Every panel promptText must describe the speech balloon/caption/SFX placement and identify which character is speaking.",
                "- Every promptPackCopyText block must include a Dialogue and lettering plan section listing every panel's exact dialogue lines.",
                "- Every promptPackCopyText block must tell gpt-image-2 to render all listed dialogue lines and not omit speech balloons.",
                "- Every promptPackCopyText block must enforce one consistent clean rounded manga lettering style across balloons, captions, and SFX.",
                "- Every promptPackCopyText block must include one compact style/anatomy line: black-and-white manga, pure white mascot bodies, no hands/arms, visible connected feet, and mouth-state continuity.",
                "- Every promptPackCopyText block that includes Sunny Spritz must explicitly state that she keeps two small rounded feet directly under her soft five-point star body.",
                "- Every promptPackCopyText block must translate hand actions into telekinetic object movement.",
                "- Character consistency should be driven by requiredUploads and attached model sheets first. Do not paste long global identity locks into every page.",
                "- Add only compact active-character high-risk reminders when relevant: Muci broad squat/no brow/consistent left lean; Nia sharp/one brow/tall narrow controlled body; Snacri right-leaning/open round eyes; Padaruna sharp centered point plus lower-heavy chubby pear-bottom body/no brows/not Nia-shaped; Padarana upright soft point/closed eyes; Professor Cera Lin rounded six-sided hexagon; Coach Ray shield-shaped.",
                "- Pages with two or more of Muci, Artrans, Padaruna, Padarana, Snacri, and Nia must keep fixed height tiers as invisible production guidance only: Muci/Artrans shorter, Padaruna/Padarana/Snacri standard, Nia about 1.1x Padaruna. Never make the height reference a visible story object.",
                "- Character intro/name cards must appear only once per character, on the intended first story-page introduction. On later pages, explicitly do not repeat prior intro/name cards.",
                "- Pages with two or more similar teardrop characters must use one short silhouette separation sentence and rely on the comparison/model-sheet references, not long repeated paragraphs.",
                "- Reference notes should name exact model-sheet, scene, and prop files. Avoid repeating full character paragraphs there.",
                "- For every page, return a promptPackCopyText block that can be pasted directly into the image-generation tool.",
                "- For every page, return a referenceNotesCopyText block that can also be pasted directly into the image-generation tool or production notes.",
                "- For every panel, tell the team which visual beat is happening and what needs to stay stable.",
                "- Prefer the chapter-specific scene reference files whenever the page happens in a known chapter scene location.",
                "- Required uploads must be organized per page, and each item must include real upload image file names plus the matching relative paths.",
                "- Use CHARACTER for character model sheets, SCENE for reusable master location refs, and CHAPTER_SCENE for chapter-only location sheets.",
                "- The global gpt-image-2 notes should explain how to preserve continuity, camera logic, reference reuse, clean high-contrast black-and-white manga style, pure white character fills, model-sheet exactness, mouth-state continuity, handless telekinetic action, exact dialogue rendering, and consistent lettering style across all 10 story pages plus the generated cover.",
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
    throw new Error("OpenAI returned story pages that do not match the 10-page comic workflow.");
  }

  const normalizedStoryPages = pages
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

  const episodeLogline = normalizedOutput.episodeLogline.trim();
  const episodeSynopsis = normalizedOutput.episodeSynopsis.trim();
  const coverPage = buildComicCoverPagePrompt({
    packageInput: input,
    pages: normalizedStoryPages,
    episodeLogline,
    episodeSynopsis
  });

  return {
    episodeLogline,
    episodeSynopsis,
    episodeScript: normalizedOutput.episodeScript.trim(),
    pagePlan: [
      `Cover: ${coverPage.pagePurpose}`,
      normalizedOutput.pagePlan.trim()
    ].join("\n\n"),
    pages: [coverPage, ...normalizedStoryPages],
    globalGptImage2Notes: ensureReferenceNotesIncludeLettering(
      normalizedOutput.globalGptImage2Notes
    )
  };
}
