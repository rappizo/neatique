"use server";

import { redirect } from "next/navigation";
import { requireFullAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getComicCharacterReferenceFolder, getComicSceneReferenceFolder } from "@/lib/comic-paths";
import {
  ComicReferenceUploadError,
  saveComicReferenceUpload
} from "@/lib/comic-reference-uploads";
import {
  getComicCharacterLockHistory,
  getComicSceneLockHistory,
  pushComicCharacterLockSnapshot,
  pushComicSceneLockSnapshot
} from "@/lib/comic-lock-history";
import {
  getNextComicEpisodeNumber,
  isComicEpisodeNumberTaken
} from "@/lib/comic-episode-numbering";
import {
  normalizeComicCharacterChineseName,
  resolveComicCharacterChineseName
} from "@/lib/comic-character-chinese-names";
import {
  COMIC_APPROVAL_ASSET_TYPES,
  COMIC_CHINESE_PAGE_ASSET_TYPE,
  COMIC_EXTRA_PAGE_ASSET_TYPE,
  COMIC_PAGE_ASSET_TYPES,
  getComicRequiredPageNumbers,
  isComicPublishPageNumber
} from "@/lib/comic-pages";
import {
  ComicPageUploadInputError,
  uploadComicPageAsset
} from "@/lib/comic-page-upload";
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

function hasCharacterLockChanged(
  existing: {
    role: string;
    appearance: string;
    personality: string;
    speechGuide: string;
    referenceNotes: string | null;
  },
  next: {
    role: string;
    appearance: string;
    personality: string;
    speechGuide: string;
    referenceNotes: string | null;
  }
) {
  return (
    existing.role !== next.role ||
    existing.appearance !== next.appearance ||
    existing.personality !== next.personality ||
    existing.speechGuide !== next.speechGuide ||
    (existing.referenceNotes || null) !== (next.referenceNotes || null)
  );
}

function hasSceneLockChanged(
  existing: {
    summary: string;
    visualNotes: string;
    moodNotes: string;
    referenceNotes: string | null;
  },
  next: {
    summary: string;
    visualNotes: string;
    moodNotes: string;
    referenceNotes: string | null;
  }
) {
  return (
    existing.summary !== next.summary ||
    existing.visualNotes !== next.visualNotes ||
    existing.moodNotes !== next.moodNotes ||
    (existing.referenceNotes || null) !== (next.referenceNotes || null)
  );
}

function getReferenceUploadStatus(error: unknown) {
  if (error instanceof ComicReferenceUploadError) {
    return error.status;
  }

  return "reference-upload-failed";
}

function normalizeComicWorkspaceFolder(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "");
}

function getSceneReferenceFolderForUpdate(existingReferenceFolder: string, nextSlug: string) {
  const normalizedExistingFolder = normalizeComicWorkspaceFolder(existingReferenceFolder);

  return normalizedExistingFolder || getComicSceneReferenceFolder(nextSlug);
}

function usesStandardSceneReferenceFolder(referenceFolder: string, sceneSlug: string) {
  return (
    normalizeComicWorkspaceFolder(referenceFolder) ===
    normalizeComicWorkspaceFolder(getComicSceneReferenceFolder(sceneSlug))
  );
}

export async function saveComicProjectAction(formData: FormData) {
  await requireFullAdminSession();
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
  await requireFullAdminSession();
  const { ensureComicWorkspaceScaffold, ensureComicCharacterWorkspace } =
    await loadComicWorkspaceModule();
  await ensureComicWorkspaceScaffold();

  const name = toPlainString(formData.get("name"));
  const slug = buildComicSlug(formData.get("slug"), name);

  if (!name || !slug) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-fields"));
  }

  const projectId = await ensureComicProjectId(toPlainString(formData.get("projectId")));
  const chineseName =
    normalizeComicCharacterChineseName(formData.get("chineseName")?.toString()) ||
    resolveComicCharacterChineseName({ name, slug });
  const character = await prisma.comicCharacter.create({
    data: {
      projectId,
      name,
      chineseName,
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

  await ensureComicCharacterWorkspace(character.slug, character.name, character.chineseName);
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/characters/${character.id}`, "created"));
}

export async function updateComicCharacterAction(formData: FormData) {
  await requireFullAdminSession();
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

  const chineseName =
    normalizeComicCharacterChineseName(formData.get("chineseName")?.toString()) ||
    resolveComicCharacterChineseName({ name, slug });

  const nextLock = {
    role: toPlainString(formData.get("role")) || existing.role,
    appearance: normalizeLongText(formData.get("appearance")) || existing.appearance,
    personality: normalizeLongText(formData.get("personality")) || existing.personality,
    speechGuide: normalizeLongText(formData.get("speechGuide")) || existing.speechGuide,
    referenceNotes: normalizeLongText(formData.get("referenceNotes")) || null
  };

  if (hasCharacterLockChanged(existing, nextLock)) {
    await pushComicCharacterLockSnapshot(id, existing, "手动保存前的版本");
  }

  const updated = await prisma.comicCharacter.update({
    where: { id },
    data: {
      name,
      chineseName,
      slug,
      role: nextLock.role,
      appearance: nextLock.appearance,
      personality: nextLock.personality,
      speechGuide: nextLock.speechGuide,
      referenceFolder: getComicCharacterReferenceFolder(slug),
      referenceNotes: nextLock.referenceNotes,
      active: toBool(formData.get("active")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  await ensureComicCharacterWorkspace(updated.slug, updated.name, updated.chineseName);
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/characters/${id}`, "saved"));
}

export async function uploadComicCharacterReferenceAction(formData: FormData) {
  await requireFullAdminSession();
  const { ensureComicCharacterWorkspace } = await loadComicWorkspaceModule();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-character"));
  }

  const character = await prisma.comicCharacter.findUnique({
    where: { id }
  });

  if (!character) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-character"));
  }

  const file = formData.get("referenceImage");

  try {
    await ensureComicCharacterWorkspace(character.slug, character.name, character.chineseName);
    await saveComicReferenceUpload({
      bucket: "character",
      slug: character.slug,
      relativeFolder: character.referenceFolder,
      file: file instanceof File ? file : null,
      requestedFileName: toPlainString(formData.get("fileName")),
      label: toPlainString(formData.get("label"))
    });
  } catch (error) {
    console.error("Comic character reference upload failed:", error);
    redirect(buildComicRedirect(`/admin/comic/characters/${id}#references`, getReferenceUploadStatus(error)));
  }

  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/characters/${id}#references`, "reference-uploaded"));
}

export async function reviseComicCharacterLockAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const revisionInstruction = normalizeLongText(formData.get("revisionInstruction"));
  const redirectTo = id ? `/admin/comic/characters/${id}#lock` : "/admin/comic/characters";
  let status = "lock-revised";

  try {
    const { reviseComicCharacterLock } = await import("@/lib/comic-lock-revision");
    const result = await reviseComicCharacterLock({ id, revisionInstruction });
    status = result.status;
  } catch (error) {
    console.error("Comic character lock revision failed:", error);
    status =
      error && typeof error === "object" && "status" in error && typeof error.status === "string"
        ? error.status
        : "lock-revision-failed";
  }

  redirect(buildComicRedirect(redirectTo, status));
}

export async function restoreComicCharacterLockAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const snapshotId = toPlainString(formData.get("snapshotId"));

  if (!id || !snapshotId) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-character"));
  }

  const character = await prisma.comicCharacter.findUnique({
    where: { id }
  });

  if (!character) {
    redirect(buildComicRedirect("/admin/comic/characters", "missing-character"));
  }

  const snapshot = (await getComicCharacterLockHistory(id)).find(
    (candidate) => candidate.id === snapshotId
  );

  if (!snapshot) {
    redirect(buildComicRedirect(`/admin/comic/characters/${id}#history`, "missing-lock-history"));
  }

  await pushComicCharacterLockSnapshot(id, character, "回溯前的版本");
  await prisma.comicCharacter.update({
    where: { id },
    data: {
      role: snapshot.role,
      appearance: snapshot.appearance,
      personality: snapshot.personality,
      speechGuide: snapshot.speechGuide,
      referenceNotes: snapshot.referenceNotes
    }
  });

  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/characters/${id}#lock`, "lock-restored"));
}

export async function createComicSceneAction(formData: FormData) {
  await requireFullAdminSession();
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
  await requireFullAdminSession();
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

  const nextLock = {
    summary: normalizeLongText(formData.get("summary")) || existing.summary,
    visualNotes: normalizeLongText(formData.get("visualNotes")) || existing.visualNotes,
    moodNotes: normalizeLongText(formData.get("moodNotes")) || existing.moodNotes,
    referenceNotes: normalizeLongText(formData.get("referenceNotes")) || null
  };
  const referenceFolder = getSceneReferenceFolderForUpdate(existing.referenceFolder, slug);

  if (hasSceneLockChanged(existing, nextLock)) {
    await pushComicSceneLockSnapshot(id, existing, "手动保存前的版本");
  }

  const updated = await prisma.comicScene.update({
    where: { id },
    data: {
      name,
      slug,
      summary: nextLock.summary,
      visualNotes: nextLock.visualNotes,
      moodNotes: nextLock.moodNotes,
      referenceFolder,
      referenceNotes: nextLock.referenceNotes,
      active: toBool(formData.get("active")),
      sortOrder: Math.max(0, toInt(formData.get("sortOrder"), existing.sortOrder))
    }
  });

  if (usesStandardSceneReferenceFolder(referenceFolder, updated.slug)) {
    await ensureComicSceneWorkspace(updated.slug, updated.name);
  }
  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/scenes/${id}`, "saved"));
}

export async function uploadComicSceneReferenceAction(formData: FormData) {
  await requireFullAdminSession();
  const { ensureComicSceneWorkspace } = await loadComicWorkspaceModule();

  const id = toPlainString(formData.get("id"));
  if (!id) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-scene"));
  }

  const scene = await prisma.comicScene.findUnique({
    where: { id }
  });

  if (!scene) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-scene"));
  }

  const file = formData.get("referenceImage");

  try {
    await ensureComicSceneWorkspace(scene.slug, scene.name);
    await saveComicReferenceUpload({
      bucket: "scene",
      slug: scene.slug,
      relativeFolder: scene.referenceFolder,
      file: file instanceof File ? file : null,
      requestedFileName: toPlainString(formData.get("fileName")),
      label: toPlainString(formData.get("label"))
    });
  } catch (error) {
    console.error("Comic scene reference upload failed:", error);
    redirect(buildComicRedirect(`/admin/comic/scenes/${id}#references`, getReferenceUploadStatus(error)));
  }

  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/scenes/${id}#references`, "reference-uploaded"));
}

export async function reviseComicSceneLockAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const revisionInstruction = normalizeLongText(formData.get("revisionInstruction"));
  const redirectTo = id ? `/admin/comic/scenes/${id}#lock` : "/admin/comic/scenes";
  let status = "lock-revised";

  try {
    const { reviseComicSceneLock } = await import("@/lib/comic-lock-revision");
    const result = await reviseComicSceneLock({ id, revisionInstruction });
    status = result.status;
  } catch (error) {
    console.error("Comic scene lock revision failed:", error);
    status =
      error && typeof error === "object" && "status" in error && typeof error.status === "string"
        ? error.status
        : "lock-revision-failed";
  }

  redirect(buildComicRedirect(redirectTo, status));
}

export async function restoreComicSceneLockAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const snapshotId = toPlainString(formData.get("snapshotId"));

  if (!id || !snapshotId) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-scene"));
  }

  const scene = await prisma.comicScene.findUnique({
    where: { id }
  });

  if (!scene) {
    redirect(buildComicRedirect("/admin/comic/scenes", "missing-scene"));
  }

  const snapshot = (await getComicSceneLockHistory(id)).find(
    (candidate) => candidate.id === snapshotId
  );

  if (!snapshot) {
    redirect(buildComicRedirect(`/admin/comic/scenes/${id}#history`, "missing-lock-history"));
  }

  await pushComicSceneLockSnapshot(id, scene, "回溯前的版本");
  await prisma.comicScene.update({
    where: { id },
    data: {
      summary: snapshot.summary,
      visualNotes: snapshot.visualNotes,
      moodNotes: snapshot.moodNotes,
      referenceNotes: snapshot.referenceNotes
    }
  });

  revalidateComicRoutes();
  redirect(buildComicRedirect(`/admin/comic/scenes/${id}#lock`, "lock-restored"));
}

export async function createComicSeasonAction(formData: FormData) {
  await requireFullAdminSession();
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
  await requireFullAdminSession();
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
  await requireFullAdminSession();
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
  await requireFullAdminSession();
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
  await requireFullAdminSession();
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
  const requestedEpisodeNumber = toInt(formData.get("episodeNumber"), 0);
  const episodeNumber =
    requestedEpisodeNumber > 0 ? requestedEpisodeNumber : await getNextComicEpisodeNumber();

  if (!title || !slug) {
    redirect(buildComicRedirect(`/admin/comic/chapters/${chapterId}`, "missing-fields"));
  }

  if (await isComicEpisodeNumberTaken(episodeNumber)) {
    redirect(buildComicRedirect(`/admin/comic/chapters/${chapterId}`, "duplicate-episode-number"));
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
  redirect(
    buildComicRedirect(
      `/admin/comic/outline-studio?scope=episode&id=${episode.id}`,
      "created"
    )
  );
}

export async function deleteComicEpisodeAssetAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const requestedRedirectTo = toPlainString(formData.get("redirectTo"));
  if (!id) {
    redirect(buildComicRedirect(requestedRedirectTo || "/admin/comic", "missing-asset"));
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
    redirect(buildComicRedirect(requestedRedirectTo || "/admin/comic", "missing-asset"));
  }

  const fallbackRedirectTo = `/admin/comic/publish-center/chapters/${asset.episode.chapterId}#episode-${asset.episodeId}`;

  if (
    asset.episode.published &&
    asset.published &&
    isComicApprovalAssetType(asset.assetType) &&
    isComicPublishPageNumber(asset.sortOrder)
  ) {
    redirect(
      buildComicRedirect(
        requestedRedirectTo || fallbackRedirectTo,
        "unpublish-before-approval-change"
      )
    );
  }

  await prisma.comicEpisodeAsset.delete({
    where: { id }
  });

  revalidateComicRoutes({
    seasonSlug: asset.episode.chapter.season.slug,
    chapterSlug: asset.episode.chapter.slug,
    episodeSlug: asset.episode.slug
  });
  redirect(
    buildComicRedirect(
      requestedRedirectTo || fallbackRedirectTo,
      requestedRedirectTo ? "page-rejected" : "asset-deleted"
    )
  );
}

function isComicPageAssetType(assetType: string) {
  return COMIC_PAGE_ASSET_TYPES.includes(assetType);
}

function isChineseComicPageAssetType(assetType: string) {
  return assetType === COMIC_CHINESE_PAGE_ASSET_TYPE;
}

function isComicApprovalAssetType(assetType: string) {
  return COMIC_APPROVAL_ASSET_TYPES.includes(assetType);
}

function isComicExtraPageAssetType(assetType: string) {
  return assetType === COMIC_EXTRA_PAGE_ASSET_TYPE;
}

function getComicPublishRedirect(formData: FormData, fallback = "/admin/comic/publish-center") {
  return toPlainString(formData.get("redirectTo")) || fallback;
}

export async function approveComicExtraPageAssetAction(formData: FormData) {
  await requireFullAdminSession();

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

  if (!asset || !isComicExtraPageAssetType(asset.assetType)) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  await prisma.$transaction([
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        assetType: COMIC_EXTRA_PAGE_ASSET_TYPE,
        sortOrder: asset.sortOrder,
        title: asset.title
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

export async function unapproveComicExtraPageAssetAction(formData: FormData) {
  await requireFullAdminSession();

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

  if (!asset || !isComicExtraPageAssetType(asset.assetType)) {
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

export async function approveComicEpisodeAssetAction(formData: FormData) {
  await requireFullAdminSession();

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

  if (!isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  if (asset.episode.published) {
    redirect(buildComicRedirect(redirectTo, "unpublish-before-approval-change"));
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
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
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
  await requireFullAdminSession();

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

  if (!isComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  if (asset.episode.published) {
    redirect(buildComicRedirect(redirectTo, "unpublish-before-approval-change"));
  }

  await prisma.comicEpisodeAsset.update({
    where: { id },
    data: {
      published: false
    }
  });

  await prisma.comicEpisodeAsset.updateMany({
    where: {
      episodeId: asset.episodeId,
      sortOrder: asset.sortOrder,
      assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
    },
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

export async function approveChineseComicPageAssetAction(formData: FormData) {
  await requireFullAdminSession();

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
          assets: {
            where: {
              published: true,
              assetType: { in: COMIC_PAGE_ASSET_TYPES }
            },
            select: {
              sortOrder: true
            }
          },
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

  if (!isChineseComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  if (asset.episode.published) {
    redirect(buildComicRedirect(redirectTo, "unpublish-before-approval-change"));
  }

  const hasApprovedEnglishPage = asset.episode.assets.some(
    (candidate) => candidate.sortOrder === asset.sortOrder
  );

  if (!hasApprovedEnglishPage) {
    redirect(buildComicRedirect(redirectTo, "missing-approved-page"));
  }

  await prisma.$transaction([
    prisma.comicEpisodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        sortOrder: asset.sortOrder,
        id: { not: asset.id },
        assetType: COMIC_CHINESE_PAGE_ASSET_TYPE
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
  redirect(buildComicRedirect(redirectTo, "page-chinese-approved"));
}

export async function unapproveChineseComicPageAssetAction(formData: FormData) {
  await requireFullAdminSession();

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

  if (!isChineseComicPageAssetType(asset.assetType) || !isComicPublishPageNumber(asset.sortOrder)) {
    redirect(buildComicRedirect(redirectTo, "missing-asset"));
  }

  if (asset.episode.published) {
    redirect(buildComicRedirect(redirectTo, "unpublish-before-approval-change"));
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
  redirect(buildComicRedirect(redirectTo, "page-chinese-unapproved"));
}

export async function createChineseComicPageVersionAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = getComicPublishRedirect(formData);
  let status = "page-chinese-failed";

  try {
    const { createChineseComicPageVersion } = await import("@/lib/comic-chinese-page-version");
    const result = await createChineseComicPageVersion({ assetId: id });
    status = result.status;
  } catch (error) {
    status =
      error && typeof error === "object" && "status" in error && typeof error.status === "string"
        ? error.status
        : "page-chinese-failed";
  }

  redirect(buildComicRedirect(redirectTo, status));
}

export async function editComicPageAssetAction(formData: FormData) {
  await requireFullAdminSession();

  const id = toPlainString(formData.get("id"));
  const redirectTo = getComicPublishRedirect(formData);
  const editInstruction = normalizeLongText(formData.get("editInstruction"));
  let status = "page-edit-failed";

  try {
    const { editComicPageImageForAsset } = await import("@/lib/comic-page-image-edit");
    const result = await editComicPageImageForAsset({ assetId: id, editInstruction });
    status = result.status;
  } catch (error) {
    status =
      error && typeof error === "object" && "status" in error && typeof error.status === "string"
        ? error.status
        : "page-edit-failed";
  }

  redirect(buildComicRedirect(redirectTo, status));
}

export async function uploadComicPageAssetAction(formData: FormData) {
  await requireFullAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo = getComicPublishRedirect(formData);
  const file = formData.get("comicPageFile");
  let status = "page-uploaded";

  try {
    const result = await uploadComicPageAsset({
      episodeId,
      pageNumber: toInt(formData.get("pageNumber"), 1),
      file: file instanceof File ? file : null,
      approveAfterUpload: toBool(formData.get("approveAfterUpload")),
      title: toPlainString(formData.get("title")),
      altText: toPlainString(formData.get("altText")),
      caption: normalizeLongText(formData.get("caption")) || null
    });

    status = result.status;
  } catch (error) {
    if (error instanceof ComicPageUploadInputError) {
      status = error.status;
    } else {
      throw error;
    }
  }

  redirect(buildComicRedirect(redirectTo, status));
}

export async function publishComicEpisodeFromCenterAction(formData: FormData) {
  await requireFullAdminSession();

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
        select: {
          assetType: true,
          sortOrder: true,
          imageUrl: true,
          altText: true
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

  const hasAllRequiredPages = getComicRequiredPageNumbers().every((pageNumber) =>
    approvedPageNumbers.has(pageNumber)
  );

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
        coverImageUrl: firstPageAsset?.imageUrl || episode.coverImageUrl || null,
        coverImageAlt:
          firstPageAsset?.altText ||
          episode.coverImageAlt ||
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

export async function unpublishComicEpisodeFromCenterAction(formData: FormData) {
  await requireFullAdminSession();

  const episodeId = toPlainString(formData.get("episodeId"));
  const redirectTo = getComicPublishRedirect(formData);

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

  await prisma.comicEpisode.update({
    where: { id: episodeId },
    data: {
      published: false,
      publishedAt: null
    }
  });

  revalidateComicRoutes({
    seasonSlug: episode.chapter.season.slug,
    chapterSlug: episode.chapter.slug,
    episodeSlug: episode.slug
  });
  redirect(buildComicRedirect(redirectTo, "episode-unpublished"));
}
