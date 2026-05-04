import { prisma } from "@/lib/db";
import { createChineseComicPageVersion } from "@/lib/comic-chinese-page-version";
import { reviseComicCharacterLock, reviseComicSceneLock } from "@/lib/comic-lock-revision";
import { runComicOutlineTask, type ComicOutlineTaskType } from "@/lib/comic-outline-generation";
import { editComicPageImageForAsset } from "@/lib/comic-page-image-edit";
import { generateComicImageCreation } from "@/lib/comic-image-creation";
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
  | "chinese-page-version"
  | "image-creation";

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
  imagePrompt?: string;
  aspectRatio?: string;
  imageQuality?: string;
  referenceCreationId?: string;
  referenceImageName?: string;
  imageCreationId?: string;
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
  defer?: boolean;
  message?: string;
  errorMessage?: string;
  assetId?: string;
  imageUrl?: string;
  payloadPatch?: ComicAiTaskPayload;
  attemptFailures?: Array<{
    attempt: number;
    errorMessage: string;
    createdAt: string;
  }>;
  [key: string]: unknown;
};

const ACTIVE_TASK_STATUSES: ComicAiTaskStatus[] = ["QUEUED", "RUNNING"];
const RETRYABLE_TASK_STATUSES: ComicAiTaskStatus[] = ["FAILED", "CANCELLED"];
const DEFAULT_STALE_RUNNING_TASK_MS = 1000 * 60 * 3;
const IMAGE_HEAVY_TASK_TYPES = new Set<ComicAiTaskType>([
  "generate",
  "edit",
  "chinese-page-version",
  "image-creation"
]);

function getStaleRunningTaskMs() {
  const configuredMinutes = Number.parseInt(process.env.COMIC_TASK_STALE_MINUTES || "", 10);

  if (!Number.isFinite(configuredMinutes) || configuredMinutes <= 0) {
    return DEFAULT_STALE_RUNNING_TASK_MS;
  }

  return Math.min(Math.max(configuredMinutes, 3), 60) * 60 * 1000;
}

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

function getDefaultMaxAttempts(taskType: ComicAiTaskType) {
  return taskType === "outline" || taskType === "prompt-package" || IMAGE_HEAVY_TASK_TYPES.has(taskType)
    ? 3
    : 2;
}

function getImageTaskConcurrency() {
  const configured = Number.parseInt(process.env.COMIC_IMAGE_TASK_CONCURRENCY || "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 1;
  }

  return Math.min(Math.max(configured, 1), 3);
}

function isRetryableComicAiTaskError(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  const retryableFragments = [
    "timeout",
    "timed out",
    "aborted",
    "econnreset",
    "etimedout",
    "fetch failed",
    "network",
    "upstream",
    "socket",
    "connection refused",
    "rate limit",
    "429",
    "500",
    "502",
    "503",
    "504",
    "temporarily unavailable",
    "overloaded",
    "try again",
    "connection",
    "can't reach database",
    "database server"
  ];

  return retryableFragments.some((fragment) => normalized.includes(fragment));
}

function getRetryingErrorMessage(errorMessage: string) {
  return `Previous attempt failed: ${errorMessage} Retrying automatically.`;
}

function getPayloadPatch(result: ComicAiTaskResult | null) {
  return result?.payloadPatch &&
    typeof result.payloadPatch === "object" &&
    !Array.isArray(result.payloadPatch)
    ? result.payloadPatch
    : {};
}

function getAttemptFailures(result: ComicAiTaskResult | null) {
  return Array.isArray(result?.attemptFailures)
    ? result.attemptFailures.filter(
        (failure) =>
          failure &&
          Number.isFinite(failure.attempt) &&
          typeof failure.errorMessage === "string" &&
          typeof failure.createdAt === "string"
      )
    : [];
}

function buildRetryAttemptResult(
  task: ComicAiTaskModelRecord,
  previousResult: ComicAiTaskResult | null,
  errorMessage: string
): ComicAiTaskResult {
  return {
    ok: false,
    retrying: true,
    message: getRetryingErrorMessage(errorMessage),
    errorMessage,
    attemptFailures: [
      ...getAttemptFailures(previousResult),
      {
        attempt: task.attempts,
        errorMessage,
        createdAt: new Date().toISOString()
      }
    ]
  };
}

function mergeAttemptFailuresIntoSuccessResult(
  previousResult: ComicAiTaskResult | null,
  nextResult: ComicAiTaskResult | null
) {
  const attemptFailures = getAttemptFailures(previousResult);
  const result = nextResult || { ok: true };

  return attemptFailures.length > 0
    ? {
        ...result,
        attemptFailures
      }
    : result;
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
    case "image-creation":
      return {
        episodeId: null,
        pageNumber: null,
        targetId: null,
        sourceAssetId: null
      };
  }
}

async function executeComicAiTask(
  taskType: ComicAiTaskType,
  payload: ComicAiTaskPayload,
  context: { attempt: number }
) {
  switch (taskType) {
    case "generate":
      return generateComicPageImageForEpisode({
        episodeId: toStringValue(payload.episodeId),
        pageNumber: toNumberValue(payload.pageNumber),
        attempt: context.attempt
      });
    case "edit":
      return editComicPageImageForAsset({
        assetId: toStringValue(payload.assetId || payload.sourceAssetId),
        editInstruction: toStringValue(payload.editInstruction),
        attempt: context.attempt
      });
    case "prompt-package":
      return generateComicPromptPackageForEpisode({
        episodeId: toStringValue(payload.episodeId),
        openAiResponseId: toStringValue(payload.openAiResponseId)
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
    case "image-creation":
      return generateComicImageCreation({
        prompt: toStringValue(payload.prompt || payload.imagePrompt),
        aspectRatio: toStringValue(payload.aspectRatio),
        quality: toStringValue(payload.quality || payload.imageQuality),
        referenceCreationId: toStringValue(payload.referenceCreationId),
        referenceImage:
          payload.referenceImage && typeof payload.referenceImage === "object"
            ? (payload.referenceImage as {
                base64Data?: string | null;
                mimeType?: string | null;
                fileName?: string | null;
              })
            : null,
        attempt: context.attempt
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
    revisionInstruction: toOptionalStringValue(payload.revisionInstruction),
    imagePrompt: toOptionalStringValue(payload.prompt || payload.imagePrompt),
    aspectRatio: toOptionalStringValue(payload.aspectRatio),
    imageQuality: toOptionalStringValue(payload.quality || payload.imageQuality || result?.quality),
    referenceCreationId: toOptionalStringValue(payload.referenceCreationId),
    referenceImageName:
      payload.referenceImage && typeof payload.referenceImage === "object"
        ? toOptionalStringValue((payload.referenceImage as Record<string, unknown>).fileName)
        : undefined,
    imageCreationId: toOptionalStringValue(result?.creationId)
  };
}

export async function listComicAiTasks(limit = 40) {
  await recoverStaleRunningTasks();

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
  await recoverStaleRunningTasks();

  const payload = stringifyPayload(input.payload);
  const lookupFields = getTaskLookupFields(input.taskType, input.payload);
  const activeTaskWhere =
    input.taskType === "prompt-package" && lookupFields.episodeId
      ? {
          taskType: input.taskType,
          episodeId: lookupFields.episodeId,
          status: {
            in: ACTIVE_TASK_STATUSES
          }
        }
      : {
          taskType: input.taskType,
          payload,
          status: {
            in: ACTIVE_TASK_STATUSES
          }
        };
  const existingTask = await prisma.comicAiTask.findFirst({
    where: activeTaskWhere,
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
      maxAttempts: input.maxAttempts ?? getDefaultMaxAttempts(input.taskType),
      ...lookupFields
    }
  });

  return toClientComicAiTask(createdTask);
}

export async function cancelComicAiTask(id: string) {
  await prisma.comicAiTask.updateMany({
    where: {
      id,
      status: {
        in: ["QUEUED", "RUNNING"]
      }
    },
    data: {
      status: "CANCELLED",
      lockedAt: null,
      errorMessage: "Task cancelled by admin.",
      completedAt: new Date()
    }
  });

  const task = await prisma.comicAiTask.findUnique({ where: { id } });
  return task ? toClientComicAiTask(task) : null;
}

export async function retryComicAiTask(id: string) {
  const existingTask = await prisma.comicAiTask.findUnique({
    where: { id },
    select: { taskType: true }
  });

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
      maxAttempts: existingTask
        ? getDefaultMaxAttempts(existingTask.taskType as ComicAiTaskType)
        : undefined,
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
  const staleDate = new Date(Date.now() - getStaleRunningTaskMs());
  const staleTasks = await prisma.comicAiTask.findMany({
    where: {
      status: "RUNNING",
      lockedAt: {
        lt: staleDate
      }
    },
    select: {
      id: true,
      attempts: true,
      maxAttempts: true
    }
  });

  await Promise.all(
    staleTasks.map((task) =>
      prisma.comicAiTask.updateMany({
        where: {
          id: task.id,
          status: "RUNNING"
        },
        data:
          task.attempts >= task.maxAttempts
            ? {
                status: "FAILED",
                lockedAt: null,
                completedAt: new Date(),
                errorMessage: "The server worker timed out before completing this task."
              }
            : {
                status: "QUEUED",
                lockedAt: null,
                errorMessage: "The previous server worker timed out; the task was returned to the queue."
              }
      })
    )
  );
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

function selectQueuedComicAiTasks(tasks: ComicAiTaskModelRecord[], limit: number) {
  const selected: ComicAiTaskModelRecord[] = [];
  const imageTaskLimit = getImageTaskConcurrency();
  let selectedImageTasks = 0;

  for (const task of tasks) {
    if (selected.length >= limit) {
      break;
    }

    const taskType = task.taskType as ComicAiTaskType;

    if (IMAGE_HEAVY_TASK_TYPES.has(taskType)) {
      if (selectedImageTasks >= imageTaskLimit) {
        continue;
      }

      selectedImageTasks += 1;
    }

    selected.push(task);
  }

  return selected;
}

async function runClaimedComicAiTask(task: ComicAiTaskModelRecord) {
  const taskType = task.taskType as ComicAiTaskType;
  const payload = parseTaskPayload(task.payload);
  const previousResult = parseTaskResult(task.result);

  try {
    const result = (await executeComicAiTask(taskType, payload, {
      attempt: task.attempts
    })) as ComicAiTaskResult;

    if (result?.defer === true) {
      const payloadPatch = getPayloadPatch(result);
      const nextPayload =
        Object.keys(payloadPatch).length > 0
          ? stringifyPayload({
              ...payload,
              ...payloadPatch
            })
          : task.payload;
      const deferMessage =
        typeof result.message === "string" ? result.message : "Task is still running remotely.";
      const update = await prisma.comicAiTask.updateMany({
        where: { id: task.id, status: "RUNNING" },
        data: {
          status: "QUEUED",
          payload: nextPayload,
          result: JSON.stringify(result),
          errorMessage: deferMessage,
          completedAt: null,
          lockedAt: null,
          attempts: {
            decrement: 1
          }
        }
      });

      return {
        id: task.id,
        ok: false,
        deferred: update.count > 0,
        skipped: update.count === 0,
        errorMessage:
          update.count > 0 ? deferMessage : "Task was no longer running when the worker deferred."
      };
    }

    if (result?.ok === false) {
      const errorMessage =
        typeof result.errorMessage === "string"
          ? result.errorMessage
          : typeof result.message === "string"
            ? result.message
            : "Comic AI task failed.";
      const shouldRetry =
        task.attempts < task.maxAttempts && isRetryableComicAiTaskError(errorMessage);

      const update = await prisma.comicAiTask.updateMany({
        where: { id: task.id, status: "RUNNING" },
        data: shouldRetry
          ? {
              status: "QUEUED",
              result: JSON.stringify(buildRetryAttemptResult(task, previousResult, errorMessage)),
              errorMessage: getRetryingErrorMessage(errorMessage),
              completedAt: null,
              lockedAt: null
            }
          : {
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
        skipped: update.count === 0,
        retrying: shouldRetry && update.count > 0,
        errorMessage:
          update.count > 0 ? errorMessage : "Task was no longer running when the worker finished."
      };
    }

    const update = await prisma.comicAiTask.updateMany({
      where: { id: task.id, status: "RUNNING" },
      data: {
        status: "SUCCEEDED",
        result: JSON.stringify(mergeAttemptFailuresIntoSuccessResult(previousResult, result)),
        errorMessage: null,
        completedAt: new Date(),
        lockedAt: null
      }
    });

    return {
      id: task.id,
      ok: update.count > 0,
      skipped: update.count === 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown comic AI task error.";
    const shouldRetry =
      task.attempts < task.maxAttempts && isRetryableComicAiTaskError(errorMessage);

    const update = await prisma.comicAiTask.updateMany({
      where: { id: task.id, status: "RUNNING" },
      data: {
        status: shouldRetry ? "QUEUED" : "FAILED",
        result: shouldRetry
          ? JSON.stringify(buildRetryAttemptResult(task, previousResult, errorMessage))
          : null,
        errorMessage: shouldRetry ? getRetryingErrorMessage(errorMessage) : errorMessage,
        completedAt: shouldRetry ? null : new Date(),
        lockedAt: null
      }
    });

    return {
      id: task.id,
      ok: false,
      skipped: update.count === 0,
      retrying: shouldRetry && update.count > 0,
      errorMessage:
        update.count > 0 ? errorMessage : "Task was no longer running when the worker failed."
    };
  }
}

export async function runComicAiTaskQueue(input: { limit?: number } = {}) {
  await recoverStaleRunningTasks();
  const limit = Math.min(Math.max(input.limit || 1, 1), 5);

  const queuedTaskCandidates = await prisma.comicAiTask.findMany({
    where: {
      status: "QUEUED"
    },
    orderBy: [{ createdAt: "asc" }],
    take: limit * 4
  });
  const queuedTasks = selectQueuedComicAiTasks(queuedTaskCandidates, limit);

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
