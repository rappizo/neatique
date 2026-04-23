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
};

type ComicSceneContext = {
  name: string;
  slug: string;
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceFolder: string;
  referenceNotes: string | null;
};

type ComicChapterSceneReferenceContext = {
  label: string;
  fileName: string;
  relativePath: string;
};

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
  panelNumber: number;
  panelTitle: string;
  promptText: string;
  characterRefs: string[];
  sceneRefs: string[];
  uploadChecklist: string[];
};

export type GeneratedComicPromptPackage = {
  episodeLogline: string;
  episodeSynopsis: string;
  episodeScript: string;
  pagePlan: string;
  panelPrompts: GeneratedComicPanelPrompt[];
  referenceChecklist: Array<{
    bucket: "CHARACTER" | "SCENE";
    name: string;
    slug: string;
    requiredUploads: string[];
  }>;
  gptImage2Instructions: string;
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
          `  Reference notes: ${character.referenceNotes || "None"}`
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
          `  Reference notes: ${scene.referenceNotes || "None"}`
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
      episodeScript: { type: "string", minLength: 500, maxLength: 5000 },
      pagePlan: { type: "string", minLength: 180, maxLength: 4000 },
      panelPrompts: {
        type: "array",
        minItems: 4,
        maxItems: 16,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            panelNumber: { type: "integer", minimum: 1, maximum: 32 },
            panelTitle: { type: "string", minLength: 4, maxLength: 90 },
            promptText: { type: "string", minLength: 40, maxLength: 800 },
            characterRefs: {
              type: "array",
              items: { type: "string", minLength: 1, maxLength: 80 },
              maxItems: 8
            },
            sceneRefs: {
              type: "array",
              items: { type: "string", minLength: 1, maxLength: 80 },
              maxItems: 6
            },
            uploadChecklist: {
              type: "array",
              items: { type: "string", minLength: 5, maxLength: 160 },
              maxItems: 10
            }
          },
          required: ["panelNumber", "panelTitle", "promptText", "characterRefs", "sceneRefs", "uploadChecklist"]
        }
      },
      referenceChecklist: {
        type: "array",
        minItems: 1,
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            bucket: { type: "string", enum: ["CHARACTER", "SCENE"] },
            name: { type: "string", minLength: 2, maxLength: 120 },
            slug: { type: "string", minLength: 2, maxLength: 120 },
            requiredUploads: {
              type: "array",
              items: { type: "string", minLength: 5, maxLength: 160 },
              maxItems: 10
            }
          },
          required: ["bucket", "name", "slug", "requiredUploads"]
        }
      },
      gptImage2Instructions: { type: "string", minLength: 120, maxLength: 2200 }
    },
    required: [
      "episodeLogline",
      "episodeSynopsis",
      "episodeScript",
      "pagePlan",
      "panelPrompts",
      "referenceChecklist",
      "gptImage2Instructions"
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
                "When you build the upload checklist, explicitly state which character reference images and scene reference images should be uploaded before using gpt-image-2.",
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
                "- Create a page plan and a panel-by-panel prompt pack.",
                `- Assume the image generation step will use ${DEFAULT_OPENAI_COMIC_IMAGE_MODEL}.`,
                "- For every panel, tell the team which character refs and scene refs matter.",
                "- Prefer the chapter-specific scene reference files whenever the panel happens in a known Chapter scene pack location.",
                "- In the reference checklist, group the upload needs into CHARACTER and SCENE buckets.",
                "- The gpt-image-2 instructions should tell the creator exactly what to upload and how to preserve continuity across pages.",
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
    !Array.isArray(normalizedOutput.panelPrompts) ||
    !Array.isArray(normalizedOutput.referenceChecklist) ||
    typeof normalizedOutput.gptImage2Instructions !== "string"
  ) {
    throw new Error("OpenAI returned an invalid comic prompt package.");
  }

  return {
    episodeLogline: normalizedOutput.episodeLogline.trim(),
    episodeSynopsis: normalizedOutput.episodeSynopsis.trim(),
    episodeScript: normalizedOutput.episodeScript.trim(),
    pagePlan: normalizedOutput.pagePlan.trim(),
    panelPrompts: normalizedOutput.panelPrompts as GeneratedComicPanelPrompt[],
    referenceChecklist: normalizedOutput.referenceChecklist as GeneratedComicPromptPackage["referenceChecklist"],
    gptImage2Instructions: normalizedOutput.gptImage2Instructions.trim()
  };
}
