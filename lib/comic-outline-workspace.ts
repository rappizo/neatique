import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getComicRootFolder } from "@/lib/comic-paths";

const COMIC_ROOT_PATH = path.join(process.cwd(), getComicRootFolder());

function toRelativeWorkspacePath(targetPath: string) {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, "/");
}

function formatGeneratedOutlineFile(title: string, outline: string) {
  return [`# ${title.trim()}`, "", outline.trim(), ""].join("\n");
}

async function writeGeneratedOutlineFile(targetPath: string, title: string, outline: string) {
  if (!title.trim() || !outline.trim()) {
    return;
  }

  try {
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, formatGeneratedOutlineFile(title, outline), "utf8");
  } catch (error) {
    console.warn(
      `Comic generated outline workspace write skipped for ${toRelativeWorkspacePath(targetPath)}:`,
      error
    );
  }
}

export async function writeGeneratedSeasonOutlineToWorkspace(input: {
  seasonSlug: string;
  title: string;
  outline: string;
}) {
  await writeGeneratedOutlineFile(
    path.join(COMIC_ROOT_PATH, "seasons", input.seasonSlug, "season-outline.md"),
    input.title,
    input.outline
  );
}

export async function writeGeneratedChapterOutlineToWorkspace(input: {
  seasonSlug: string;
  chapterSlug: string;
  title: string;
  outline: string;
}) {
  await writeGeneratedOutlineFile(
    path.join(
      COMIC_ROOT_PATH,
      "seasons",
      input.seasonSlug,
      input.chapterSlug,
      "chapter-outline.md"
    ),
    input.title,
    input.outline
  );
}

export async function writeGeneratedEpisodeOutlineToWorkspace(input: {
  seasonSlug: string;
  chapterSlug: string;
  episodeSlug: string;
  title: string;
  outline: string;
}) {
  await writeGeneratedOutlineFile(
    path.join(
      COMIC_ROOT_PATH,
      "seasons",
      input.seasonSlug,
      input.chapterSlug,
      input.episodeSlug,
      "episode-outline.md"
    ),
    input.title,
    input.outline
  );
}
