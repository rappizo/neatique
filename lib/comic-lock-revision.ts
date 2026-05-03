import { revalidateComicRoutes } from "@/app/admin/comic-action-helpers";
import { prisma } from "@/lib/db";
import {
  pushComicCharacterLockSnapshot,
  pushComicSceneLockSnapshot
} from "@/lib/comic-lock-history";
import {
  getComicCharacterReferenceFiles,
  getComicSceneReferenceFiles
} from "@/lib/comic-reference-manifest";

export type ComicLockRevisionStatus =
  | "lock-revised"
  | "lock-revision-failed"
  | "lock-revision-missing"
  | "missing-character"
  | "missing-scene";

export class ComicLockRevisionInputError extends Error {
  status: ComicLockRevisionStatus;

  constructor(status: ComicLockRevisionStatus, message: string) {
    super(message);
    this.name = "ComicLockRevisionInputError";
    this.status = status;
  }
}

export type ComicLockRevisionResult = {
  ok: boolean;
  status: ComicLockRevisionStatus;
  id: string;
  entityType: "character" | "scene";
  message: string;
  errorMessage?: string;
};

function normalizeInstruction(value: string) {
  return value.trim();
}

export async function reviseComicCharacterLock(input: {
  id: string;
  revisionInstruction: string;
}): Promise<ComicLockRevisionResult> {
  const id = input.id.trim();
  const revisionInstruction = normalizeInstruction(input.revisionInstruction);

  if (!id) {
    throw new ComicLockRevisionInputError("missing-character", "Character is required.");
  }

  if (!revisionInstruction) {
    throw new ComicLockRevisionInputError(
      "lock-revision-missing",
      "Enter a revision instruction before updating this character lock."
    );
  }

  const character = await prisma.comicCharacter.findUnique({
    where: { id }
  });

  if (!character) {
    throw new ComicLockRevisionInputError("missing-character", "That comic character is missing.");
  }

  try {
    const { reviseComicCharacterLockWithAi } = await import("@/lib/openai-comic");
    const revised = await reviseComicCharacterLockWithAi({
      name: character.name,
      slug: character.slug,
      role: character.role,
      appearance: character.appearance,
      personality: character.personality,
      speechGuide: character.speechGuide,
      referenceNotes: character.referenceNotes,
      referenceFiles: getComicCharacterReferenceFiles(character.slug),
      revisionInstruction
    });

    await pushComicCharacterLockSnapshot(id, character, revisionInstruction);
    await prisma.comicCharacter.update({
      where: { id },
      data: {
        role: revised.role,
        appearance: revised.appearance,
        personality: revised.personality,
        speechGuide: revised.speechGuide,
        referenceNotes: revised.referenceNotes || null
      }
    });

    revalidateComicRoutes();

    return {
      ok: true,
      status: "lock-revised",
      id,
      entityType: "character",
      message: `Updated ${character.name} character lock.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown character lock revision error.";

    revalidateComicRoutes();

    return {
      ok: false,
      status: "lock-revision-failed",
      id,
      entityType: "character",
      message: `${character.name} character lock revision failed.`,
      errorMessage
    };
  }
}

export async function reviseComicSceneLock(input: {
  id: string;
  revisionInstruction: string;
}): Promise<ComicLockRevisionResult> {
  const id = input.id.trim();
  const revisionInstruction = normalizeInstruction(input.revisionInstruction);

  if (!id) {
    throw new ComicLockRevisionInputError("missing-scene", "Scene is required.");
  }

  if (!revisionInstruction) {
    throw new ComicLockRevisionInputError(
      "lock-revision-missing",
      "Enter a revision instruction before updating this scene lock."
    );
  }

  const scene = await prisma.comicScene.findUnique({
    where: { id }
  });

  if (!scene) {
    throw new ComicLockRevisionInputError("missing-scene", "That comic scene is missing.");
  }

  try {
    const { reviseComicSceneLockWithAi } = await import("@/lib/openai-comic");
    const revised = await reviseComicSceneLockWithAi({
      name: scene.name,
      slug: scene.slug,
      summary: scene.summary,
      visualNotes: scene.visualNotes,
      moodNotes: scene.moodNotes,
      referenceNotes: scene.referenceNotes,
      referenceFiles: getComicSceneReferenceFiles(scene.slug),
      revisionInstruction
    });

    await pushComicSceneLockSnapshot(id, scene, revisionInstruction);
    await prisma.comicScene.update({
      where: { id },
      data: {
        summary: revised.summary,
        visualNotes: revised.visualNotes,
        moodNotes: revised.moodNotes,
        referenceNotes: revised.referenceNotes || null
      }
    });

    revalidateComicRoutes();

    return {
      ok: true,
      status: "lock-revised",
      id,
      entityType: "scene",
      message: `Updated ${scene.name} scene lock.`
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown scene lock revision error.";

    revalidateComicRoutes();

    return {
      ok: false,
      status: "lock-revision-failed",
      id,
      entityType: "scene",
      message: `${scene.name} scene lock revision failed.`,
      errorMessage
    };
  }
}
