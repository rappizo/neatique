import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const COMIC_ROOT = path.join(process.cwd(), "comic");

function toRelativeWorkspacePath(targetPath: string) {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, "/");
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeIfMissing(targetPath: string, content: string) {
  try {
    if (await pathExists(targetPath)) {
      return;
    }

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
  } catch (error) {
    console.warn(`Comic workspace write skipped for ${toRelativeWorkspacePath(targetPath)}:`, error);
  }
}

export function getComicRootPath() {
  return COMIC_ROOT;
}

export function getComicCharacterReferenceFolder(slug: string) {
  return toRelativeWorkspacePath(path.join(COMIC_ROOT, "characters", slug, "refs"));
}

export function getComicSceneReferenceFolder(slug: string) {
  return toRelativeWorkspacePath(path.join(COMIC_ROOT, "scenes", slug, "refs"));
}

function getSeasonFolderPath(seasonSlug: string) {
  return path.join(COMIC_ROOT, "seasons", seasonSlug);
}

function getChapterFolderPath(seasonSlug: string, chapterSlug: string) {
  return path.join(getSeasonFolderPath(seasonSlug), chapterSlug);
}

function getEpisodeFolderPath(seasonSlug: string, chapterSlug: string, episodeSlug: string) {
  return path.join(getChapterFolderPath(seasonSlug, chapterSlug), episodeSlug);
}

export async function ensureComicWorkspaceScaffold() {
  await writeIfMissing(
    path.join(COMIC_ROOT, "README.md"),
    [
      "# Comic Workspace",
      "",
      "This folder is the local comic-production workspace for Neatique.",
      "",
      "- `characters/` stores stable character reference notes and fixed visual folders.",
      "- `scenes/` stores location notes and reusable scene references.",
      "- `story-bible/` stores the long-form canon, season plans, and world rules.",
      "- `seasons/` stores the working folders for every season/chapter/episode.",
      "- `templates/` stores starter files for future comic planning.",
      "",
      "The website reads comic publishing data from the database. This workspace exists so Codex and your local repo can keep the long-form creative materials organized."
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "characters", "README.md"),
    [
      "# Characters",
      "",
      "Create one folder per character.",
      "",
      "Recommended contents:",
      "- `profile.md`",
      "- `appearance.json`",
      "- `personality.json`",
      "- `refs/` with stable model sheets, expressions, outfits, and angle references"
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "scenes", "README.md"),
    [
      "# Scenes",
      "",
      "Create one folder per reusable location or environment.",
      "",
      "Recommended contents:",
      "- `scene.md`",
      "- `details.json`",
      "- `refs/` with lighting, layout, time-of-day, and mood references"
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "story-bible", "series-overview.md"),
    [
      "# Series Overview",
      "",
      "## Core premise",
      "",
      "## Tone and emotional promise",
      "",
      "## Main cast",
      "",
      "## Long-form story arc",
      "",
      "## Themes to protect",
      "",
      "## Things the story should never break"
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "story-bible", "world-rules.md"),
    [
      "# World Rules",
      "",
      "- Timeline rules",
      "- Power / logic rules",
      "- Relationship rules",
      "- Visual continuity rules"
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "story-bible", "visual-style-guide.md"),
    [
      "# Visual Style Guide",
      "",
      "## Panel rhythm",
      "",
      "## Character consistency rules",
      "",
      "## Camera language",
      "",
      "## Color and lighting logic",
      "",
      "## What `gpt-image-2` prompts should keep stable"
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "seasons", "README.md"),
    [
      "# Seasons",
      "",
      "Each season folder is created automatically when a season is added from the admin comic tools.",
      "",
      "Inside each season folder, chapters and episodes are nested to keep prompts, scripts, and final comic pages together."
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "templates", "character-profile-template.md"),
    [
      "# Character Name",
      "",
      "## Role",
      "",
      "## Appearance lock",
      "",
      "## Personality lock",
      "",
      "## Voice and dialogue rhythm",
      "",
      "## Non-negotiable visual references",
      "",
      "## Reusable prompt notes"
    ].join("\n")
  );

  await writeIfMissing(
    path.join(COMIC_ROOT, "templates", "scene-template.md"),
    [
      "# Scene Name",
      "",
      "## Purpose in story",
      "",
      "## Fixed visual structure",
      "",
      "## Time / lighting variations",
      "",
      "## Props to keep stable",
      "",
      "## Reusable prompt notes"
    ].join("\n")
  );
}

export async function ensureComicCharacterWorkspace(slug: string, name: string) {
  const characterPath = path.join(COMIC_ROOT, "characters", slug);
  await ensureComicWorkspaceScaffold();
  await writeIfMissing(
    path.join(characterPath, "profile.md"),
    [
      `# ${name}`,
      "",
      "## Role",
      "",
      "## Appearance lock",
      "",
      "## Personality lock",
      "",
      "## Voice guide",
      "",
      "## Canon notes"
    ].join("\n")
  );
  await writeIfMissing(path.join(characterPath, "appearance.json"), "{\n  \"silhouette\": \"\",\n  \"outfit\": \"\",\n  \"hair\": \"\",\n  \"face\": \"\"\n}\n");
  await writeIfMissing(path.join(characterPath, "personality.json"), "{\n  \"temperament\": \"\",\n  \"motivation\": \"\",\n  \"speech\": \"\",\n  \"relationships\": []\n}\n");
  await writeIfMissing(
    path.join(characterPath, "refs", "README.md"),
    [
      `# ${name} reference images`,
      "",
      "Place the locked character references here before generating comic images.",
      "",
      "Suggested files:",
      "- master-front.webp",
      "- master-3q.webp",
      "- master-side.webp",
      "- outfit-main.webp",
      "- expressions-sheet.webp"
    ].join("\n")
  );
}

export async function ensureComicSceneWorkspace(slug: string, name: string) {
  const scenePath = path.join(COMIC_ROOT, "scenes", slug);
  await ensureComicWorkspaceScaffold();
  await writeIfMissing(
    path.join(scenePath, "scene.md"),
    [
      `# ${name}`,
      "",
      "## Story purpose",
      "",
      "## Stable layout",
      "",
      "## Lighting and mood",
      "",
      "## Props and continuity"
    ].join("\n")
  );
  await writeIfMissing(path.join(scenePath, "details.json"), "{\n  \"cameraAngles\": [],\n  \"lightingModes\": [],\n  \"colorNotes\": \"\"\n}\n");
  await writeIfMissing(
    path.join(scenePath, "refs", "README.md"),
    [
      `# ${name} reference images`,
      "",
      "Place the fixed scene references here.",
      "",
      "Suggested files:",
      "- master-wide.webp",
      "- daylight.webp",
      "- sunset.webp",
      "- night.webp",
      "- prop-closeups.webp"
    ].join("\n")
  );
}

export async function ensureComicSeasonWorkspace(seasonSlug: string, title: string) {
  const seasonPath = getSeasonFolderPath(seasonSlug);
  await ensureComicWorkspaceScaffold();
  await writeIfMissing(
    path.join(seasonPath, "season-outline.md"),
    [`# ${title}`, "", "## Season objective", "", "## Chapter flow", "", "## Emotional arc"].join("\n")
  );
}

export async function ensureComicChapterWorkspace(
  seasonSlug: string,
  seasonTitle: string,
  chapterSlug: string,
  chapterTitle: string
) {
  const chapterPath = getChapterFolderPath(seasonSlug, chapterSlug);
  await ensureComicSeasonWorkspace(seasonSlug, seasonTitle);
  await writeIfMissing(
    path.join(chapterPath, "chapter-outline.md"),
    [`# ${chapterTitle}`, "", "## Chapter objective", "", "## Episode beats", "", "## Cliffhanger / payoff"].join("\n")
  );
}

export async function ensureComicEpisodeWorkspace(input: {
  seasonSlug: string;
  seasonTitle: string;
  chapterSlug: string;
  chapterTitle: string;
  episodeSlug: string;
  episodeTitle: string;
}) {
  const episodePath = getEpisodeFolderPath(input.seasonSlug, input.chapterSlug, input.episodeSlug);
  await ensureComicChapterWorkspace(
    input.seasonSlug,
    input.seasonTitle,
    input.chapterSlug,
    input.chapterTitle
  );
  await writeIfMissing(
    path.join(episodePath, "episode-outline.md"),
    [`# ${input.episodeTitle}`, "", "## Episode promise", "", "## Key beats", "", "## Notes for prompt generation"].join("\n")
  );
  await writeIfMissing(path.join(episodePath, "script.md"), "# Script\n\n");
  await writeIfMissing(path.join(episodePath, "panel-plan.json"), "{\n  \"pages\": []\n}\n");
  await writeIfMissing(path.join(episodePath, "prompt-pack.json"), "{\n  \"panelPrompts\": []\n}\n");
  await writeIfMissing(path.join(episodePath, "required-refs.json"), "{\n  \"references\": []\n}\n");
  await writeIfMissing(
    path.join(episodePath, "renders", "README.md"),
    [
      `# ${input.episodeTitle} renders`,
      "",
      "Store generated comic pages, panel tests, or approved final pages here."
    ].join("\n")
  );
}
