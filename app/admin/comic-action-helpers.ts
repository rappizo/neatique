import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { slugify, toPlainString } from "@/lib/utils";

export const DEFAULT_PROJECT_DATA = {
  slug: "main",
  title: "Neatique Comic Universe",
  shortDescription:
    "A multi-season comic project with stable characters, reusable scene references, and production-ready prompt planning.",
  storyOutline: "Add the full multi-season story outline here.",
  worldRules: "Add the rules, logic, and canon constraints for the comic world here.",
  visualStyleGuide:
    "Define the line quality, panel rhythm, camera language, color mood, and continuity rules here.",
  workflowNotes:
    "Use this project as the source of truth for character locks, scene locks, and episode-level prompt generation."
};

export function buildComicRedirect(basePath: string, status: string) {
  const hashIndex = basePath.indexOf("#");
  const pathWithQuery = hashIndex >= 0 ? basePath.slice(0, hashIndex) : basePath;
  const hashFragment = hashIndex >= 0 ? basePath.slice(hashIndex) : "";
  const [pathname, queryString = ""] = pathWithQuery.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return `${nextQuery ? `${pathname}?${nextQuery}` : pathname}${hashFragment}`;
}

export async function ensureComicProjectId(inputProjectId?: string) {
  if (inputProjectId) {
    const existing = await prisma.comicProject.findUnique({
      where: { id: inputProjectId },
      select: { id: true }
    });

    if (existing) {
      return existing.id;
    }
  }

  const firstProject = await prisma.comicProject.findFirst({
    orderBy: [{ createdAt: "asc" }],
    select: { id: true }
  });

  if (firstProject) {
    return firstProject.id;
  }

  const created = await prisma.comicProject.create({
    data: DEFAULT_PROJECT_DATA,
    select: { id: true }
  });

  return created.id;
}

export function revalidateComicRoutes(slugs?: {
  seasonSlug?: string | null;
  chapterSlug?: string | null;
  episodeSlug?: string | null;
}) {
  revalidatePath("/admin/comic");
  revalidatePath("/admin/comic/project");
  revalidatePath("/admin/comic/characters");
  revalidatePath("/admin/comic/scenes");
  revalidatePath("/admin/comic/seasons");
  revalidatePath("/admin/comic/outline-studio");
  revalidatePath("/admin/comic/prompt-studio");
  revalidatePath("/admin/comic/publish-center");
  revalidatePath("/comic");

  if (slugs?.seasonSlug) {
    revalidatePath(`/comic/${slugs.seasonSlug}`);
  }

  if (slugs?.seasonSlug && slugs?.chapterSlug) {
    revalidatePath(`/comic/${slugs.seasonSlug}/${slugs.chapterSlug}`);
  }

  if (slugs?.seasonSlug && slugs?.chapterSlug && slugs?.episodeSlug) {
    revalidatePath(`/comic/${slugs.seasonSlug}/${slugs.chapterSlug}/${slugs.episodeSlug}`);
  }
}

export function normalizeLongText(value: FormDataEntryValue | null) {
  return toPlainString(value);
}

export function buildComicSlug(rawValue: FormDataEntryValue | null, fallback: string) {
  return slugify(toPlainString(rawValue) || fallback);
}
