import { prisma } from "@/lib/db";
import { createChineseComicPageVersion } from "@/lib/comic-chinese-page-version";
import { reviseComicCharacterLock, reviseComicSceneLock } from "@/lib/comic-lock-revision";
import { runComicOutlineTask, type ComicOutlineTaskType } from "@/lib/comic-outline-generation";
import { editComicPageImageForAsset } from "@/lib/comic-page-image-edit";
import { generateComicPageImageForEpisode } from "@/lib/comic-page-image-generation";
import {
  generateComicPromptPackageForEpisode,
  reviseComicPagePromptForEpisode
} from "@/lib/comic-prompt-generation";

export type ComicAiTaskType =
  | "generate"
  | "edit"
  | "prompt-package"
  | "prompt-revision"
  | "outline"
  | "character-lock-revision"
  | "scene-lock-revision"
  | "chinese-page-version";

export type ComicAiTaskStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type ComicAiTaskClientStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export type ComicAiTaskPayload = Record<string, unknown>;

export type ComicAiTaskClientRecord = {
  id: string;
  kind: ComicAiTaskType;
  episodeId: string;
  pageNumber: number;
  label: string;
  status: ComicAiTaskClientStatus;
  createdAt: number;
  completedAt?: number;
  message?: string;
  errorMessage?: string;
  assetId?: string;
  imageUrl?: string;
  sourceAssetId?: string;
  editInstruction?: string;
  promptSuggestion?: string;
  outlineTaskType?: string;
  targetId?: string;
  revisionNotes?: string;
  characterId?: string;
  sceneId?: string;
  revisionInstruction?: string;
};

type ComicAiTaskModelRecord = {
  id: string;
  taskType: string;
  label: string;
  status: string;
  payload: string;
  result: string | null;
  errorMessage: string | null;
  episodeId: string | null;
  pageNumber: number | null;
  targetId: string | null;
  sourceAssetId: string | null;
  attempts: number;
  maxAttempts: number;
  lockedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ComicAiTaskResult = {
  ok?: boolean;
  message?: string;
  errorMessage?: string;
  assetId?: string;
  imageUrl?: string;
  [key: string]: unknown;
};

const ACTIVE_TASK_STATUSES: ComicAiTaskStatus[] = ["QUEUED", "RUNNING"];
const RETRYABLE_TASK_STATUSES: ComicAiTaskStatus[] = ["FAILED", "CANCELLED"];
const STALE_RUNNING_TASK_MS = 1000 * 60 * 20;

function normalizePayloadValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizePayloadValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizePayloadValue(entryValue)])
    );
  }

  return value;
}

function stringifyPayload(payload: ComicAiTaskPayload) {
  return JSON.stringify(normalizePayloadValue(payload));
}

function parseTaskPayload(payload: string): ComicAiTaskPayload {
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ComicAiTaskPayload)
      : {};
  } catch {
    return {};
  }
}

function parseTaskResult(result: string | null): ComicAiTaskResult | null {
  if (!result) {
    return null;
  }

  try {
    const parsed = JSON.parse(result);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ComicAiTaskResult)
      : null;
  } catch {
    return null;
  }
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toOptionalStringValue(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toClientStatus(status: string): ComicAiTaskClientStatus {
  switch (status) {
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "success";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "QUEUED":
    default:
      return "queued";
  }
}

function getTaskMessage(task: ComicAiTaskModelRecord, result: ComicAiTaskResult | null) {
  if (typeof result?.message === "string") {
    return result.message;
  }

  if (task.status === "QUEUED") {
    return "Waiting for server worker.";
  }

  if (task.status === "RUNNING") {
    return "Running on the server.";
  }

  if (task.status === "CANCELLED") {
    return "Task cancelled.";
  }

  return undefined;
}

function getTaskLookupFields(taskType: ComicAiTaskType, payload: ComicAiTaskPayload) {
  switch (taskType) {
    case "generate":
      return {
        episodeId: toStringValue(payload.episodeId) || null,
        pageNumber: toNumberValue(payload.pageNumber) || null,
        targetId: null,
        sourceAssetId: null
      };
    case "edit":
      return {
        episodeId: toStringValue(payload.episodeId) || null,
        pageNumber: toNumberValue(payload.pageNumber) || null,
        targetId: null,
        sourceAssetId: toStringValue(payload.assetId || payload.sourceAssetId) || null
      };
    case "prompt-package":
      return {
        episodeId: toStringValue(payload.episodeId) || null,
        pageNumber: null,
        targetId: null,
        sourceAssetId: null
      };
    case "prompt-revision":
      return {
        episodeId: toStringValue(payload.episodeId) || null,
        pageNumber: toNumberValue(payload.pageNumber) || null,
        targetId: null,
        sourceAssetId: null
      };
    case "outline":
      return {
        episodeId: null,
        pageNumber: null,
        targetId: toStringValue(payload.targetId) || null,
        sourceAssetId: null
      };
    case "character-lock-revision":
      return {
        episodeId: null,
        pageNumber: null,
        targetId: toStringValue(payload.id || payload.characterId) || null,
        sourceAssetId: null
      };
    case "scene-lock-revision":
      return {
        episodeId: null,
        pageNumber: null,
        targetId: toStringValue(payload.id || payload.sceneId) || null,
        sourceAssetId: null
      };
    case "chinese-page-version":
      return {
        episodeId: toStringValue(payload.episodeId) || null,
        pageNumber: toNumberValue(payload.pageNumber) || null,
        targetId: null,
        sourceAssetId: toStringValue(payload.assetId || payload.sourceAssetId) || null
      };
  }
}

async function executeComicAiTask(taskType: ComicAiTaskType, payload: ComicAiTaskPayload) {
  switch (taskType) {
    case "generate":
      return generateComicPageImageForEpisode({
        episodeId: toStringValue(payload.episodeId),
        pageNumber: toNumberValue(payload.pageNumber)
      });
    case "edit":
      return editComicPageImageForAsset({
        assetId: toStringValue(payload.assetId || payload.sourceAssetId),
        editInstruction: toStringValue(payload.editInstruction)
      });
    case "prompt-package":
      return generateComicPromptPackageForEpisode({
        episodeId: toStringValue(payload.episodeId)
      });
    case "prompt-revision":
      return reviseComicPagePromptForEpisode({
        episodeId: toStringValue(payload.episodeId),
        pageNumber: toNumberValue(payload.pageNumber),
        promptSuggestion: toStringValue(payload.promptSuggestion)
      });
    case "outline":
      return runComicOutlineTask({
        taskType: toStringValue(payload.taskType || payload.outlineTaskType) as ComicOutlineTaskType,
        targetId: toStringValue(payload.targetId),
        revisionNotes: toStringValue(payload.revisionNotes)
      });
    case "character-lock-revision":
      return reviseComicCharacterLock({
        id: toStringValue(payload.id || payload.characterId),
        revisionInstruction: toStringValue(payload.revisionInstruction)
      });
    case "scene-lock-revision":
      return reviseComicSceneLock({
        id: toStringValue(payload.id || payload.sceneId),
        revisionInstruction: toStringValue(payload.revisionInstruction)
      });
    case "chinese-page-version":
      return createChineseComicPageVersion({
        assetId: toStringValue(payload.assetId || payload.sourceAssetId)
      });
  }
}

export function toClientComicAiTask(task: ComicAiTaskModelRecord): ComicAiTaskClientRecord {
  const payload = parseTaskPayload(task.payload);
  const result = parseTaskResult(task.result);
  const sourceAssetId =
    task.sourceAssetId ||
    toOptionalStringValue(payload.sourceAssetId) ||
    toOptionalStringValue(payload.assetId);

  return {
    id: task.id,
    kind: task.taskType as ComicAiTaskType,
    episodeId: task.episodeId || toStringValue(payload.episodeId),
    pageNumber: task.pageNumber || toNumberValue(payload.pageNumber),
    label: task.label,
    status: toClientStatus(task.status),
    createdAt: task.createdAt.getTime(),
    completedAt: task.completedAt ? task.completedAt.getTime() : undefined,
    message: getTaskMessage(task, result),
    errorMessage: task.errorMessage || result?.errorMessage,
    assetId: toOptionalStringValue(result?.assetId),
    imageUrl: toOptionalStringValue(result?.imageUrl),
    sourceAssetId,
    editInstruction: toOptionalStringValue(payload.editInstruction),
    promptSuggestion: toOptionalStringValue(payload.promptSuggestion),
    outlineTaskType: toOptionalStringValue(payload.taskType || payload.outlineTaskType),
    targetId: task.targetId || toOptionalStringValue(payload.targetId),
    revisionNotes: toOptionalStringValue(payload.revisionNotes),
    characterId:
      task.taskType === "character-lock-revision"
        ? task.targetId || toOptionalStringValue(payload.id || payload.characterId)
        : undefined,
    sceneId:
      task.taskType === "scene-lock-revision"
        ? task.targetId || toOptionalStringValue(payload.id || payload.sceneId)
        : undefined,
    revisionInstruction: toOptionalStringValue(payload.revisionInstruction)
  };
}

export async function listComicAiTasks(limit = 40) {
  const tasks = await prisma.comicAiTask.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 100)
  });

  return tasks.map(toClientComicAiTask);
}

export async function enqueueComicAiTask(input: {
  taskType: ComicAiTaskType;
  label: string;
  payload: ComicAiTaskPayload;
  maxAttempts?: number;
}) {
  const payload = stringifyPayload(input.payload);
  const lookupFields = getTaskLookupFields(input.taskType, input.payload);
  const existingTask = await prisma.comicAiTask.findFirst({
    where: {
      taskType: input.taskType,
      payload,
      status: {
        in: ACTIVE_TASK_STATUSES
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  if (existingTask) {
    return toClientComicAiTask(existingTask);
  }

  const createdTask = await prisma.comicAiTask.create({
    data: {
      taskType: input.taskType,
      label: input.label.trim() || "Comic AI task",
      payload,
      maxAttempts: input.maxAttempts ?? 2,
      ...lookupFields
    }
  });

  return toClientComicAiTask(createdTask);
}

export async function cancelComicAiTask(id: string) {
  await prisma.comicAiTask.updateMany({
    where: {
      id,
      status: "QUEUED"
    },
    data: {
      status: "CANCELLED",
      completedAt: new Date()
    }
  });

  const task = await prisma.comicAiTask.findUnique({ where: { id } });
  return task ? toClientComicAiTask(task) : null;
}

export async function retryComicAiTask(id: string) {
  await prisma.comicAiTask.updateMany({
    where: {
      id,
      status: {
        in: RETRYABLE_TASK_STATUSES
      }
    },
    data: {
      status: "QUEUED",
      attempts: 0,
      lockedAt: null,
      completedAt: null,
      result: null,
      errorMessage: null
    }
  });

  const task = await prisma.comicAiTask.findUnique({ where: { id } });
  return task ? toClientComicAiTask(task) : null;
}

async function recoverStaleRunningTasks() {
  const staleDate = new Date(Date.now() - STALE_RUNNING_TASK_MS);

  await prisma.comicAiTask.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: {
        lt: staleDate
      }
    },
    data: {
      status: "QUEUED",
      lockedAt: null,
      errorMessage: "The previous server worker timed out; the task was returned to the queue."
    }
  });
}

async function claimComicAiTask(id: string) {
  const claim = await prisma.comicAiTask.updateMany({
    where: {
      id,
      status: "QUEUED"
    },
    data: {
      status: "RUNNING",
      lockedAt: new Date(),
      attempts: {
        increment: 1
      },
      errorMessage: null
    }
  });

  if (claim.count === 0) {
    return null;
  }

  return prisma.comicAiTask.findUnique({ where: { id } });
}

async function runClaimedComicAiTask(task: ComicAiTaskModelRecord) {
  const taskType = task.taskType as ComicAiTaskType;
  const payload = parseTaskPayload(task.payload);

  try {
    const result = (await executeComicAiTask(taskType, payload)) as ComicAiTaskResult;

    if (result?.ok === false) {
      const errorMessage =
        typeof result.errorMessage === "string"
          ? result.errorMessage
          : typeof result.message === "string"
            ? result.message
            : "Comic AI task failed.";

      await prisma.comicAiTask.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          result: JSON.stringify(result),
          errorMessage,
          completedAt: new Date(),
          lockedAt: null
        }
      });

      return {
        id: task.id,
        ok: false,
        errorMessage
      };
    }

    await prisma.comicAiTask.update({
      where: { id: task.id },
      data: {
        status: "SUCCEEDED",
        result: JSON.stringify(result || { ok: true }),
        errorMessage: null,
        completedAt: new Date(),
        lockedAt: null
      }
    });

    return {
      id: task.id,
      ok: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown comic AI task error.";
    const hasAttemptsLeft = task.attempts < task.maxAttempts;

    await prisma.comicAiTask.update({
      where: { id: task.id },
      data: {
        status: hasAttemptsLeft ? "QUEUED" : "FAILED",
        result: null,
        errorMessage,
        completedAt: hasAttemptsLeft ? null : new Date(),
        lockedAt: null
      }
    });

    return {
      id: task.id,
      ok: false,
      retrying: hasAttemptsLeft,
      errorMessage
    };
  }
}

export async function runComicAiTaskQueue(input: { limit?: number } = {}) {
  await recoverStaleRunningTasks();

  const queuedTasks = await prisma.comicAiTask.findMany({
    where: {
      status: "QUEUED"
    },
    orderBy: [{ createdAt: "asc" }],
    take: Math.min(Math.max(input.limit || 1, 1), 3)
  });

  const claimedTasks = (
    await Promise.all(queuedTasks.map((task) => claimComicAiTask(task.id)))
  ).filter((task): task is ComicAiTaskModelRecord => Boolean(task));
  const results = await Promise.all(claimedTasks.map(runClaimedComicAiTask));

  return {
    ok: true,
    claimedCount: claimedTasks.length,
    results
  };
}
