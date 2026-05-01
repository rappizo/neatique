"use server";

import { Buffer } from "node:buffer";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getComicCharacterReferenceFolder, getComicSceneReferenceFolder } from "@/lib/comic-paths";
import { toBool, toInt, toPlainString } from "@/lib/utils";
import {
  buildComicRedirect,
  buildComicSlug,
  ensureComicProjectId,
  normalizeLongText,
  revalidateComicRoutes
} from "@/app/admin/comic-action-helpers";

async function loadComicWorkspaceModule() {
  return import("@/lib/comic-workspace");
}

export async function saveComicProjectAction(formData: FormData) {
  await requireAdminSession();
  const { ensureComicWorkspaceScaffold } = await loadComicWorkspaceModule();
  await ensureComicWorkspaceScaffold();

  const id = toPlainString(formData.get("id"));
  const title = toPlainString(formData.get("title"));

  if (!title) {
    redirect(buildComicRedirect("/admin/comic/project", "missing-title"));
  }

  const payload = {
    slug: buildComicSlug(formData.get("slug"), "main") || "main",
    title,
    shortDescription:
      normalizeLongText(formData.get("shortDescription")) ||
      "A multi-season comic project with stable characters, reusable scene references, and production-ready prompt planning.",
    storyOutline: normalizeLongText(formData.get("storyOutline")) || "Add the full multi-season story outline here.",
    worldRules:
      normalizeLongText(formData.get("worldRules")) ||
      "Add the rules, logic, and canon constraints for the comic world here.",
    visualStyleGuide:
      normalizeLongText(formData.get("visualStyleGuide")) ||
      "Define the line quality, panel rhythm, camera language, color mood, and continuity rules here.",
    workflowNotes:
      normalizeLongText(formData.get("workflowNotes")) ||
      "Use this project as the source of truth for character locks, scene locks, and episode-level prompt generation."
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
  const { ensureComicWorkspaceScaffold, ensureComicCharacterWorkspace } =
    await loadComicWorkspaceModule();
  await ensureComicWorkspaceScaffold();

  const name = toPlainString(formData.get("name"));
  const slug = buildComicSlug(formData.get("slug"), name);

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
      appearance:
        normalizeLongText(formData.get("appearance")) || "Add the fixed visual appearance here.",
      personality:
        normalizeLongText(formData.get("personality")) ||
        "Add the stable personality profile here.",
      speechGuide:
        normalizeLongText(formData.get("speechGuide")) ||
        "Add the dialogue rhythm and voice guide here.",
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
  const { ensureComicCharacterWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), name || existing.slug);

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
  const { ensureComicWorkspaceScaffold, ensureComicSceneWorkspace } =
    await loadComicWorkspaceModule();
  await ensureComicWorkspaceScaffold();

  const name = toPlainString(formData.get("name"));
  const slug = buildComicSlug(formData.get("slug"), name);

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
      visualNotes:
        normalizeLongText(formData.get("visualNotes")) ||
        "Describe the stable visual structure here.",
      moodNotes:
        normalizeLongText(formData.get("moodNotes")) ||
        "Describe the emotional and lighting notes here.",
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
  const { ensureComicSceneWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), name || existing.slug);

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
  const { ensureComicWorkspaceScaffold, ensureComicSeasonWorkspace } =
    await loadComicWorkspaceModule();
  await ensureComicWorkspaceScaffold();

  const title = toPlainString(formData.get("title"));
  const slug = buildComicSlug(formData.get("slug"), title);
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
  const { ensureComicSeasonWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), title || existing.slug);
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
  const { ensureComicChapterWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), title);
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
  const { ensureComicChapterWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), title || existing.slug);
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
  const { ensureComicEpisodeWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), title);
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
  const { ensureComicEpisodeWorkspace } = await loadComicWorkspaceModule();

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
  const slug = buildComicSlug(formData.get("slug"), title || existing.slug);
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

const COMIC_PUBLISH_PAGE_COUNT = 10;
const COMIC_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];

function isComicPageAssetType(assetType: string) {
  return COMIC_PAGE_ASSET_TYPES.includes(assetType);
}

function isComicPublishPageNumber(pageNumber: number) {
  return pageNumber >= 1 && pageNumber <= COMIC_PUBLISH_PAGE_COUNT;
}

function getComicPublishRedirect(formData: FormData, fallback = "/admin/comic/publish-center") {
  return toPlainString(formData.get("redirectTo")) || fallback;
}

export async function approveComicEpisodeAssetAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = getComicPublishRedirect(formData);

  if (!id) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
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
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  await prisma.$transaction([
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        id: { not: asset.id },
        assetType: { in: COMIC_PAGE_ASSET_TYPES }
      },
      data: {
        published: false
      }
    }),
    prisma.comicEpisodeAsset.update({
      where: { id },
      data: {
        published: true
      }
    })
  ]);

  revalidateComicRoutes({
    seasonSlug: asset.episode.chapter.season.slug,
    chapterSlug: asset.episode.chapter.slug,
    episodeSlug: asset.episode.slug
  });
  redirect(buildComicRedirect(redirectTo, "page-approved"));
}

export async function unapproveComicEpisodeAssetAction(formData: FormData) {
  await requireAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = getComicPublishRedirect(formData);

  if (!id) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
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
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  await prisma.comicEpisodeAsset.update({
    where: { id },
    data: {
      published: false
    }
  });

  revalidateComicRoutes({
    seasonSlug: asset.episode.chapter.season.slug,
    chapterSlug: asset.episode.chapter.slug,
    episodeSlug: asset.episode.slug
  });
  redirect(buildComicRedirect(redirectTo, "page-unapproved"));
}

export async function uploadComicPageAssetAction(formData: FormData) {
  await requireAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo = getComicPublishRedirect(formData);
  const pageNumber = Math.max(
    1,
    Math.min(COMIC_PUBLISH_PAGE_COUNT, toInt(formData.get("pageNumber"), 1))
  );
  const file = formData.get("comicPageFile");
  const shouldApprove = toBool(formData.get("approveAfterUpload"));

  if (!episodeId) {
    redirect(buildComicRedirect(redirectTo, "missing-episode"));
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
    redirect(buildComicRedirect(redirectTo, "missing-episode"));
  }

  if (!(file instanceof File) || file.size <= 0) {
    redirect(buildComicRedirect(redirectTo, "missing-upload"));
  }

  if (file.size > COMIC_UPLOAD_MAX_BYTES) {
    redirect(buildComicRedirect(redirectTo, "upload-too-large"));
  }

  if (!/^image\/(png|jpe?g|webp|avif)$/i.test(file.type)) {
    redirect(buildComicRedirect(redirectTo, "upload-type"));
  }

  const title =
    toPlainString(formData.get("title")) ||
    `${episode.title} - Uploaded Page ${String(pageNumber).padStart(2, "0")}`;
  const imageBuffer = Buffer.from(await file.arrayBuffer());

  const createdAsset = await prisma.comicEpisodeAsset.create({
    data: {
      episodeId,
      assetType: "UPLOADED_PAGE",
      title,
      imageUrl: "/media/comic/pending",
      imageData: imageBuffer.toString("base64"),
      imageMimeType: file.type || "image/png",
      altText:
        toPlainString(formData.get("altText")) ||
        `${episode.title} uploaded comic page ${pageNumber}`,
      caption: normalizeLongText(formData.get("caption")) || null,
      sortOrder: pageNumber,
      published: shouldApprove
    },
    select: {
      id: true
    }
  });

  const imageUrl = `/media/comic/${createdAsset.id}?v=${Date.now()}`;

  if (shouldApprove) {
    await prisma.$transaction([
      prisma.comicEpisodeAsset.updateMany({
        where: {
          episodeId,
          sortOrder: pageNumber,
          id: { not: createdAsset.id },
          assetType: { in: COMIC_PAGE_ASSET_TYPES }
        },
        data: {
          published: false
        }
      }),
      prisma.comicEpisodeAsset.update({
        where: { id: createdAsset.id },
        data: {
          imageUrl,
          published: true
        }
      })
    ]);
  } else {
    await prisma.comicEpisodeAsset.update({
      where: { id: createdAsset.id },
      data: {
        imageUrl
      }
    });
  }

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, shouldApprove ? "page-uploaded-approved" : "page-uploaded"));
}

export async function publishComicEpisodeFromCenterAction(formData: FormData) {
  await requireAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo = getComicPublishRedirect(formData);

  if (!episodeId) {
    redirect(buildComicRedirect(redirectTo, "missing-episode"));
  }

  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    include: {
      assets: {
        where: {
          published: true,
          assetType: { in: COMIC_PAGE_ASSET_TYPES }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      chapter: {
        include: {
          season: true
        }
      }
    }
  });

  if (!episode) {
    redirect(buildComicRedirect(redirectTo, "missing-episode"));
  }

  const approvedPageNumbers = new Set(
    episode.assets
      .filter((asset) => isComicPageAssetType(asset.assetType) && isComicPublishPageNumber(asset.sortOrder))
      .map((asset) => asset.sortOrder)
  );

  const hasAllRequiredPages = Array.from(
    { length: COMIC_PUBLISH_PAGE_COUNT },
    (_, index) => index + 1
  ).every((pageNumber) => approvedPageNumbers.has(pageNumber));

  if (!hasAllRequiredPages) {
    redirect(buildComicRedirect(redirectTo, "missing-approved-pages"));
  }

  const firstPageAsset = episode.assets[0];

  await prisma.$transaction([
    prisma.comicSeason.update({
      where: { id: episode.chapter.seasonId },
      data: { published: true }
    }),
    prisma.comicChapter.update({
      where: { id: episode.chapterId },
      data: { published: true }
    }),
    prisma.comicEpisode.update({
      where: { id: episodeId },
      data: {
        published: true,
        publishedAt: episode.publishedAt || new Date(),
        coverImageUrl: episode.coverImageUrl || firstPageAsset?.imageUrl || null,
        coverImageAlt:
          episode.coverImageAlt ||
          firstPageAsset?.altText ||
          `${episode.title} comic episode cover`
      }
    })
  ]);

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, "episode-published"));
}
