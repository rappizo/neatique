"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import {
  ensureComicCharacterWorkspace,
  ensureComicChapterWorkspace,
  ensureComicEpisodeWorkspace,
  ensureComicSceneWorkspace,
  ensureComicSeasonWorkspace,
  ensureComicWorkspaceScaffold,
  getComicCharacterReferenceFolder,
  getComicSceneReferenceFolder,
  getComicChapterSceneReferenceFolder,
  listComicChapterSceneReferences
} from "@/lib/comic-workspace";
import { syncComicWorkspaceToDatabase } from "@/lib/comic-workspace-sync";
import { generateComicPromptPackageWithAi } from "@/lib/openai-comic";
import { slugify, toBool, toInt, toPlainString } from "@/lib/utils";

const DEFAULT_PROJECT_DATA = {
  slug: "main",
  title: "Neatique Comic Universe",
  shortDescription: "A multi-season comic project with stable characters, reusable scene references, and production-ready prompt planning.",
  storyOutline: "Add the full multi-season story outline here.",
  worldRules: "Add the rules, logic, and canon constraints for the comic world here.",
  visualStyleGuide: "Define the line quality, panel rhythm, camera language, color mood, and continuity rules here.",
  workflowNotes:
    "Use this project as the source of truth for character locks, scene locks, and episode-level prompt generation."
};

function buildComicRedirect(basePath: string, status: string) {
  const [pathname, queryString = ""] = basePath.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

async function ensureComicProjectId(inputProjectId?: string) {
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

function revalidateComicRoutes(slugs?: {
  seasonSlug?: string | null;
  chapterSlug?: string | null;
  episodeSlug?: string | null;
}) {
  revalidatePath("/admin/comic");
  revalidatePath("/admin/comic/project");
  revalidatePath("/admin/comic/characters");
  revalidatePath("/admin/comic/scenes");
  revalidatePath("/admin/comic/seasons");
  revalidatePath("/admin/comic/prompt-studio");
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

function normalizeLongText(value: FormDataEntryValue | null) {
  return toPlainString(value);
}

export async function syncComicWorkspaceAction(formData?: FormData) {
  await requireAdminSession();
  const redirectTo =
    toPlainString(formData?.get("redirectTo") ?? null) || "/admin/comic";
  try {
    await syncComicWorkspaceToDatabase();
    revalidateComicRoutes();
    redirect(buildComicRedirect(redirectTo, "workspace-synced"));
  } catch (error) {
    console.error("Comic workspace sync failed:", error);
    redirect(buildComicRedirect(redirectTo, "workspace-sync-failed"));
  }
}

export async function saveComicProjectAction(formData: FormData) {
  await requireAdminSession();
  await ensureComicWorkspaceScaffold();

  const id = toPlainString(formData.get("id"));
  const title = toPlainString(formData.get("title"));

  if (!title) {
    redirect(buildComicRedirect("/admin/comic/project", "missing-title"));
  }

  const payload = {
    slug: slugify(toPlainString(formData.get("slug")) || DEFAULT_PROJECT_DATA.slug) || DEFAULT_PROJECT_DATA.slug,
    title,
    shortDescription:
      normalizeLongText(formData.get("shortDescription")) || DEFAULT_PROJECT_DATA.shortDescription,
    storyOutline: normalizeLongText(formData.get("storyOutline")) || DEFAULT_PROJECT_DATA.storyOutline,
    worldRules: normalizeLongText(formData.get("worldRules")) || DEFAULT_PROJECT_DATA.worldRules,
    visualStyleGuide:
      normalizeLongText(formData.get("visualStyleGuide")) || DEFAULT_PROJECT_DATA.visualStyleGuide,
    workflowNotes: normalizeLongText(formData.get("workflowNotes")) || DEFAULT_PROJECT_DATA.workflowNotes
  };

  if (id) {
    await prisma.comicProject.update({
      where: { id },
      data: payload
    });
  } else {
    await prisma.comicProject.create({
      data: payload
    });
  }

  revalidateComicRoutes();
  redirect(buildComicRedirect("/admin/comic/project", "saved"));
}

export async function createComicCharacterAction(formData: FormData) {
  await requireAdminSession();
  await ensureComicWorkspaceScaffold();

  const name = toPlainString(formData.get("name"));
  const slug = slugify(toPlainString(formData.get("slug")) || name);

  if (!name || !slug) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-fields"));
  }

  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const character = await prisma.comicCharacter.create({
    data: {
      projectId,
      name,
      slug,
      role: toPlainString(formData.get("role")) || "Main cast",
      appearance: normalizeLongText(formData.get("appearance")) || "Add the fixed visual appearance here.",
      personality: normalizeLongText(formData.get("personality")) || "Add the stable personality profile here.",
      speechGuide: normalizeLongText(formData.get("speechGuide")) || "Add the dialogue rhythm and voice guide here.",
      referenceFolder: getComicCharacterReferenceFolder(slug),
      referenceNotes: normalizeLongText(formData.get("referenceNotes")) || null,
      active: true,
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), 0))
    }
  });

  await ensureComicCharacterWorkspace(character.slug, character.name);
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/characters/${character.id}`, "created"));
}

export async function updateComicCharacterAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-character"));
  }

  const existing = await prisma.comicCharacter.findUnique({
    where: { id }
  });

  if (!existing) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-character"));
  }

  const name = toPlainString(formData.get("name"));
  const slug = slugify(toPlainString(formData.get("slug")) || name || existing.slug);

  if (!name || !slug) {
    redirect(buildComicRedirect(`/admin/comic/characters/${id}`, "missing-fields"));
  }

  const updated = await prisma.comicCharacter.update({
    where: { id },
    data: {
      name,
      slug,
      role: toPlainString(formData.get("role")) || existing.role,
      appearance: normalizeLongText(formData.get("appearance")) || existing.appearance,
      personality: normalizeLongText(formData.get("personality")) || existing.personality,
      speechGuide: normalizeLongText(formData.get("speechGuide")) || existing.speechGuide,
      referenceFolder: getComicCharacterReferenceFolder(slug),
      referenceNotes: normalizeLongText(formData.get("referenceNotes")) || null,
      active: toBool(formData.get("active")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  await ensureComicCharacterWorkspace(updated.slug, updated.name);
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/characters/${id}`, "saved"));
}

export async function createComicSceneAction(formData: FormData) {
  await requireAdminSession();
  await ensureComicWorkspaceScaffold();

  const name = toPlainString(formData.get("name"));
  const slug = slugify(toPlainString(formData.get("slug")) || name);

  if (!name || !slug) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-fields"));
  }

  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const scene = await prisma.comicScene.create({
    data: {
      projectId,
      name,
      slug,
      summary: normalizeLongText(formData.get("summary")) || "Add the scene summary here.",
      visualNotes: normalizeLongText(formData.get("visualNotes")) || "Describe the stable visual structure here.",
      moodNotes: normalizeLongText(formData.get("moodNotes")) || "Describe the emotional and lighting notes here.",
      referenceFolder: getComicSceneReferenceFolder(slug),
      referenceNotes: normalizeLongText(formData.get("referenceNotes")) || null,
      active: true,
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), 0))
    }
  });

  await ensureComicSceneWorkspace(scene.slug, scene.name);
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/scenes/${scene.id}`, "created"));
}

export async function updateComicSceneAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-scene"));
  }

  const existing = await prisma.comicScene.findUnique({
    where: { id }
  });

  if (!existing) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-scene"));
  }

  const name = toPlainString(formData.get("name"));
  const slug = slugify(toPlainString(formData.get("slug")) || name || existing.slug);

  if (!name || !slug) {
    redirect(buildComicRedirect(`/admin/comic/scenes/${id}`, "missing-fields"));
  }

  const updated = await prisma.comicScene.update({
    where: { id },
    data: {
      name,
      slug,
      summary: normalizeLongText(formData.get("summary")) || existing.summary,
      visualNotes: normalizeLongText(formData.get("visualNotes")) || existing.visualNotes,
      moodNotes: normalizeLongText(formData.get("moodNotes")) || existing.moodNotes,
      referenceFolder: getComicSceneReferenceFolder(slug),
      referenceNotes: normalizeLongText(formData.get("referenceNotes")) || null,
      active: toBool(formData.get("active")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  await ensureComicSceneWorkspace(updated.slug, updated.name);
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/scenes/${id}`, "saved"));
}

export async function createComicSeasonAction(formData: FormData) {
  await requireAdminSession();
  await ensureComicWorkspaceScaffold();

  const title = toPlainString(formData.get("title"));
  const slug = slugify(toPlainString(formData.get("slug")) || title);
  const seasonNumber = Math.max(1, toInt(formData.get("seasonNumber"), 1));

  if (!title || !slug) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-fields"));
  }

  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const season = await prisma.comicSeason.create({
    data: {
      projectId,
      seasonNumber,
      slug,
      title,
      summary: normalizeLongText(formData.get("summary")) || "Add the season summary here.",
      outline: normalizeLongText(formData.get("outline")) || "Add the season outline here.",
      published: toBool(formData.get("published")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), seasonNumber))
    }
  });

  await ensureComicSeasonWorkspace(season.slug, season.title);
  revalidateComicRoutes({ seasonSlug: season.slug });
  redirect(buildComicRedirect(`/admin/comic/seasons/${season.id}`, "created"));
}

export async function updateComicSeasonAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-season"));
  }

  const existing = await prisma.comicSeason.findUnique({
    where: { id }
  });

  if (!existing) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-season"));
  }

  const title = toPlainString(formData.get("title"));
  const slug = slugify(toPlainString(formData.get("slug")) || title || existing.slug);
  const seasonNumber = Math.max(1, toInt(formData.get("seasonNumber"), existing.seasonNumber));

  if (!title || !slug) {
    redirect(buildComicRedirect(`/admin/comic/seasons/${id}`, "missing-fields"));
  }

  const updated = await prisma.comicSeason.update({
    where: { id },
    data: {
      seasonNumber,
      slug,
      title,
      summary: normalizeLongText(formData.get("summary")) || existing.summary,
      outline: normalizeLongText(formData.get("outline")) || existing.outline,
      published: toBool(formData.get("published")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  await ensureComicSeasonWorkspace(updated.slug, updated.title);
  revalidateComicRoutes({ seasonSlug: updated.slug });
  redirect(buildComicRedirect(`/admin/comic/seasons/${id}`, "saved"));
}

export async function createComicChapterAction(formData: FormData) {
  await requireAdminSession();

  const seasonId = toPlainString(formData.get("seasonId"));
  if (!seasonId) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-season"));
  }

  const season = await prisma.comicSeason.findUnique({
    where: { id: seasonId }
  });

  if (!season) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-season"));
  }

  const title = toPlainString(formData.get("title"));
  const slug = slugify(toPlainString(formData.get("slug")) || title);
  const chapterNumber = Math.max(1, toInt(formData.get("chapterNumber"), 1));

  if (!title || !slug) {
    redirect(buildComicRedirect(`/admin/comic/seasons/${seasonId}`, "missing-fields"));
  }

  const chapter = await prisma.comicChapter.create({
    data: {
      seasonId,
      chapterNumber,
      slug,
      title,
      summary: normalizeLongText(formData.get("summary")) || "Add the chapter summary here.",
      outline: normalizeLongText(formData.get("outline")) || "Add the chapter outline here.",
      published: toBool(formData.get("published")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), chapterNumber))
    }
  });

  await ensureComicChapterWorkspace(season.slug, season.title, chapter.slug, chapter.title);
  revalidateComicRoutes({ seasonSlug: season.slug, chapterSlug: chapter.slug });
  redirect(buildComicRedirect(`/admin/comic/chapters/${chapter.id}`, "created"));
}

export async function updateComicChapterAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-chapter"));
  }

  const existing = await prisma.comicChapter.findUnique({
    where: { id },
    include: {
      season: true
    }
  });

  if (!existing) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-chapter"));
  }

  const title = toPlainString(formData.get("title"));
  const slug = slugify(toPlainString(formData.get("slug")) || title || existing.slug);
  const chapterNumber = Math.max(1, toInt(formData.get("chapterNumber"), existing.chapterNumber));

  if (!title || !slug) {
    redirect(buildComicRedirect(`/admin/comic/chapters/${id}`, "missing-fields"));
  }

  const updated = await prisma.comicChapter.update({
    where: { id },
    data: {
      chapterNumber,
      slug,
      title,
      summary: normalizeLongText(formData.get("summary")) || existing.summary,
      outline: normalizeLongText(formData.get("outline")) || existing.outline,
      published: toBool(formData.get("published")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  await ensureComicChapterWorkspace(existing.season.slug, existing.season.title, updated.slug, updated.title);
  revalidateComicRoutes({ seasonSlug: existing.season.slug, chapterSlug: updated.slug });
  redirect(buildComicRedirect(`/admin/comic/chapters/${id}`, "saved"));
}

export async function createComicEpisodeAction(formData: FormData) {
  await requireAdminSession();

  const chapterId = toPlainString(formData.get("chapterId"));
  if (!chapterId) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-chapter"));
  }

  const chapter = await prisma.comicChapter.findUnique({
    where: { id: chapterId },
    include: {
      season: true
    }
  });

  if (!chapter) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-chapter"));
  }

  const title = toPlainString(formData.get("title"));
  const slug = slugify(toPlainString(formData.get("slug")) || title);
  const episodeNumber = Math.max(1, toInt(formData.get("episodeNumber"), 1));

  if (!title || !slug) {
    redirect(buildComicRedirect(`/admin/comic/chapters/${chapterId}`, "missing-fields"));
  }

  const published = toBool(formData.get("published"));
  const episode = await prisma.comicEpisode.create({
    data: {
      chapterId,
      episodeNumber,
      slug,
      title,
      summary: normalizeLongText(formData.get("summary")) || "Add the episode summary here.",
      outline: normalizeLongText(formData.get("outline")) || "Add the episode outline here.",
      script: normalizeLongText(formData.get("script")) || "",
      panelPlan: normalizeLongText(formData.get("panelPlan")) || "",
      promptPack: normalizeLongText(formData.get("promptPack")) || "",
      requiredReferences: normalizeLongText(formData.get("requiredReferences")) || "",
      coverImageUrl: toPlainString(formData.get("coverImageUrl")) || null,
      coverImageAlt: toPlainString(formData.get("coverImageAlt")) || null,
      published,
      publishedAt: published ? new Date() : null,
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), episodeNumber))
    }
  });

  await ensureComicEpisodeWorkspace({
    seasonSlug: chapter.season.slug,
    seasonTitle: chapter.season.title,
    chapterSlug: chapter.slug,
    chapterTitle: chapter.title,
    episodeSlug: episode.slug,
    episodeTitle: episode.title
  });
  revalidateComicRoutes({
    seasonSlug: chapter.season.slug,
    chapterSlug: chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(`/admin/comic/episodes/${episode.id}`, "created"));
}

export async function updateComicEpisodeAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-episode"));
  }

  const existing = await prisma.comicEpisode.findUnique({
    where: { id },
    include: {
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!existing) {
    redirect(buildComicRedirect("/admin/comic/seasons", "missing-episode"));
  }

  const title = toPlainString(formData.get("title"));
  const slug = slugify(toPlainString(formData.get("slug")) || title || existing.slug);
  const episodeNumber = Math.max(1, toInt(formData.get("episodeNumber"), existing.episodeNumber));
  const published = toBool(formData.get("published"));

  if (!title || !slug) {
    redirect(buildComicRedirect(`/admin/comic/episodes/${id}`, "missing-fields"));
  }

  const publishedAtInput = toPlainString(formData.get("publishedAt"));
  const publishedAt = published
    ? publishedAtInput
      ? new Date(publishedAtInput)
      : existing.publishedAt || new Date()
    : null;

  const updated = await prisma.comicEpisode.update({
    where: { id },
    data: {
      episodeNumber,
      slug,
      title,
      summary: normalizeLongText(formData.get("summary")) || existing.summary,
      outline: normalizeLongText(formData.get("outline")) || existing.outline,
      script: normalizeLongText(formData.get("script")),
      panelPlan: normalizeLongText(formData.get("panelPlan")),
      promptPack: normalizeLongText(formData.get("promptPack")),
      requiredReferences: normalizeLongText(formData.get("requiredReferences")),
      coverImageUrl: toPlainString(formData.get("coverImageUrl")) || null,
      coverImageAlt: toPlainString(formData.get("coverImageAlt")) || null,
      published,
      publishedAt,
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  await ensureComicEpisodeWorkspace({
    seasonSlug: existing.chapter.season.slug,
    seasonTitle: existing.chapter.season.title,
    chapterSlug: existing.chapter.slug,
    chapterTitle: existing.chapter.title,
    episodeSlug: updated.slug,
    episodeTitle: updated.title
  });
  revalidateComicRoutes({
    seasonSlug: existing.chapter.season.slug,
    chapterSlug: existing.chapter.slug,
    episodeSlug: updated.slug
  });
  redirect(buildComicRedirect(`/admin/comic/episodes/${id}`, "saved"));
}

export async function createComicEpisodeAssetAction(formData: FormData) {
  await requireAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  if (!episodeId) {
    redirect(buildComicRedirect("/admin/comic", "missing-episode"));
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode) {
    redirect(buildComicRedirect("/admin/comic", "missing-episode"));
  }

  const title = toPlainString(formData.get("title"));
  const imageUrl = toPlainString(formData.get("imageUrl"));

  if (!title || !imageUrl) {
    redirect(buildComicRedirect(`/admin/comic/episodes/${episodeId}`, "missing-asset-fields"));
  }

  await prisma.comicEpisodeAsset.create({
    data: {
      episodeId,
      assetType: toPlainString(formData.get("assetType")) || "PAGE",
      title,
      imageUrl,
      altText: toPlainString(formData.get("altText")) || null,
      caption: normalizeLongText(formData.get("caption")) || null,
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), 0)),
      published: toBool(formData.get("published"))
    }
  });

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(`/admin/comic/episodes/${episodeId}`, "asset-created"));
}

export async function updateComicEpisodeAssetAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic", "missing-asset"));
  }

  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id },
    include: {
      episode: {
        include: {
          chapter: {
            include: {
              season: true
            }
          }
        }
      }
    }
  });

  if (!asset) {
    redirect(buildComicRedirect("/admin/comic", "missing-asset"));
  }

  const title = toPlainString(formData.get("title"));
  const imageUrl = toPlainString(formData.get("imageUrl"));

  if (!title || !imageUrl) {
    redirect(buildComicRedirect(`/admin/comic/episodes/${asset.episodeId}`, "missing-asset-fields"));
  }

  await prisma.comicEpisodeAsset.update({
    where: { id },
    data: {
      assetType: toPlainString(formData.get("assetType")) || asset.assetType,
      title,
      imageUrl,
      altText: toPlainString(formData.get("altText")) || null,
      caption: normalizeLongText(formData.get("caption")) || null,
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), asset.sortOrder)),
      published: toBool(formData.get("published"))
    }
  });

  revalidateComicRoutes({
    seasonSlug: asset.episode.chapter.season.slug,
    chapterSlug: asset.episode.chapter.slug,
    episodeSlug: asset.episode.slug
  });
  redirect(buildComicRedirect(`/admin/comic/episodes/${asset.episodeId}`, "asset-saved"));
}

export async function deleteComicEpisodeAssetAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic", "missing-asset"));
  }

  const asset = await prisma.comicEpisodeAsset.findUnique({
    where: { id },
    include: {
      episode: {
        include: {
          chapter: {
            include: {
              season: true
            }
          }
        }
      }
    }
  });

  if (!asset) {
    redirect(buildComicRedirect("/admin/comic", "missing-asset"));
  }

  await prisma.comicEpisodeAsset.delete({
    where: { id }
  });

  revalidateComicRoutes({
    seasonSlug: asset.episode.chapter.season.slug,
    chapterSlug: asset.episode.chapter.slug,
    episodeSlug: asset.episode.slug
  });
  redirect(buildComicRedirect(`/admin/comic/episodes/${asset.episodeId}`, "asset-deleted"));
}

export async function generateComicPromptPackageAction(formData: FormData) {
  await requireAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo = toPlainString(formData.get("redirectTo")) || `/admin/comic/prompt-studio?episodeId=${episodeId}`;

  if (!episodeId) {
    redirect(buildComicRedirect("/admin/comic/prompt-studio", "missing-episode"));
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      chapter: {
        include: {
          season: {
            include: {
              project: true
            }
          }
        }
      }
    }
  });

  if (!episode?.chapter.season.project) {
    redirect(buildComicRedirect(redirectTo, "missing-project"));
  }

  const [characters, scenes] = await Promise.all([
    prisma.comicCharacter.findMany({
      where: {
        projectId: episode.chapter.season.projectId,
        active: true
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    prisma.comicScene.findMany({
      where: {
        projectId: episode.chapter.season.projectId,
        active: true
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      })
  ]);
  const chapterSceneReferences = await listComicChapterSceneReferences(
    episode.chapter.season.slug,
    episode.chapter.slug
  );

  const inputContext = JSON.stringify(
    {
      project: {
        title: episode.chapter.season.project.title,
        slug: episode.chapter.season.project.slug
      },
      season: {
        title: episode.chapter.season.title,
        slug: episode.chapter.season.slug
      },
      chapter: {
        title: episode.chapter.title,
        slug: episode.chapter.slug
      },
      episode: {
        title: episode.title,
        slug: episode.slug
      },
      characterCount: characters.length,
      sceneCount: scenes.length,
      chapterSceneReferenceFolder: getComicChapterSceneReferenceFolder(
        episode.chapter.season.slug,
        episode.chapter.slug
      ),
      chapterSceneReferenceCount: chapterSceneReferences.length,
      chapterSceneReferenceFiles: chapterSceneReferences.map((reference) => reference.fileName)
    },
    null,
    2
  );

  try {
    const result = await generateComicPromptPackageWithAi({
      project: {
        title: episode.chapter.season.project.title,
        shortDescription: episode.chapter.season.project.shortDescription,
        storyOutline: episode.chapter.season.project.storyOutline,
        worldRules: episode.chapter.season.project.worldRules,
        visualStyleGuide: episode.chapter.season.project.visualStyleGuide,
        workflowNotes: episode.chapter.season.project.workflowNotes
      },
      season: {
        title: episode.chapter.season.title,
        summary: episode.chapter.season.summary,
        outline: episode.chapter.season.outline
      },
      chapter: {
        title: episode.chapter.title,
        summary: episode.chapter.summary,
        outline: episode.chapter.outline
      },
      episode: {
        title: episode.title,
        summary: episode.summary,
        outline: episode.outline
      },
      characters: characters.map((character) => ({
        name: character.name,
        slug: character.slug,
        role: character.role,
        appearance: character.appearance,
        personality: character.personality,
        speechGuide: character.speechGuide,
        referenceFolder: character.referenceFolder,
        referenceNotes: character.referenceNotes
      })),
      scenes: scenes.map((scene) => ({
        name: scene.name,
        slug: scene.slug,
        summary: scene.summary,
        visualNotes: scene.visualNotes,
        moodNotes: scene.moodNotes,
        referenceFolder: scene.referenceFolder,
        referenceNotes: scene.referenceNotes
      })),
      chapterSceneReferences
    });

    await prisma.$transaction([
      prisma.comicEpisode.update({
        where: { id: episodeId },
        data: {
          script: result.episodeScript,
          panelPlan: result.pagePlan,
          promptPack: JSON.stringify(
            {
              episodeLogline: result.episodeLogline,
              episodeSynopsis: result.episodeSynopsis,
              panelPrompts: result.panelPrompts
            },
            null,
            2
          ),
          requiredReferences: JSON.stringify(
            {
              referenceChecklist: result.referenceChecklist,
              gptImage2Instructions: result.gptImage2Instructions
            },
            null,
            2
          )
        }
      }),
      prisma.comicPromptRun.create({
        data: {
          episodeId,
          promptType: "EPISODE_PROMPT_PACKAGE",
          model: process.env.OPENAI_COMIC_MODEL || process.env.OPENAI_POST_MODEL || process.env.OPENAI_EMAIL_MODEL || "gpt-5.4-mini",
          imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
          status: "READY",
          inputContext,
          outputSummary: result.episodeLogline,
          promptPack: JSON.stringify(result.panelPrompts, null, 2),
          referenceChecklist: JSON.stringify(
            {
              referenceChecklist: result.referenceChecklist,
              gptImage2Instructions: result.gptImage2Instructions
            },
            null,
            2
          )
        }
      })
    ]);

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });
    redirect(buildComicRedirect(redirectTo, "prompt-generated"));
  } catch (error) {
    await prisma.comicPromptRun.create({
      data: {
        episodeId,
        promptType: "EPISODE_PROMPT_PACKAGE",
        model: process.env.OPENAI_COMIC_MODEL || process.env.OPENAI_POST_MODEL || process.env.OPENAI_EMAIL_MODEL || "gpt-5.4-mini",
        imageModel: process.env.OPENAI_COMIC_IMAGE_MODEL || "gpt-image-2",
        status: "FAILED",
        inputContext,
        outputSummary: "Prompt generation failed.",
        errorMessage: error instanceof Error ? error.message : "Unknown comic prompt generation error."
      }
    });

    revalidateComicRoutes({
      seasonSlug: episode.chapter.season.slug,
      chapterSlug: episode.chapter.slug,
      episodeSlug: episode.slug
    });
    redirect(buildComicRedirect(redirectTo, "prompt-failed"));
  }
}
