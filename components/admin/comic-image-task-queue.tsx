"use client";

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";

type ComicImageTaskStatus = "queued" | "running" | "success" | "failed" | "cancelled";
type ComicImageTaskKind =
  | "generate"
  | "edit"
  | "prompt-package"
  | "prompt-revision"
  | "outline"
  | "character-lock-revision"
  | "scene-lock-revision"
  | "chinese-page-version";

type ComicImageTask = {
  id: string;
  kind: ComicImageTaskKind;
  episodeId: string;
  pageNumber: number;
  label: string;
  status: ComicImageTaskStatus;
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

type ComicImageTaskQueueContextValue = {
  maxConcurrent: number;
  tasks: ComicImageTask[];
  enqueue: (input: { episodeId: string; pageNumber: number; label?: string }) => string;
  enqueueEdit: (input: {
    sourceAssetId: string;
    episodeId: string;
    pageNumber: number;
    editInstruction: string;
    label?: string;
  }) => string;
  enqueuePromptPackage: (input: { episodeId: string; label?: string }) => string;
  enqueuePromptRevision: (input: {
    episodeId: string;
    pageNumber: number;
    promptSuggestion: string;
    label?: string;
  }) => string;
  enqueueOutlineTask: (input: {
    taskType: string;
    targetId: string;
    revisionNotes?: string;
    label?: string;
  }) => string;
  enqueueCharacterLockRevision: (input: {
    characterId: string;
    revisionInstruction: string;
    label?: string;
  }) => string;
  enqueueSceneLockRevision: (input: {
    sceneId: string;
    revisionInstruction: string;
    label?: string;
  }) => string;
  enqueueChinesePageVersion: (input: {
    assetId: string;
    episodeId: string;
    pageNumber: number;
    label?: string;
  }) => string;
  getLatestPageTask: (episodeId: string, pageNumber: number) => ComicImageTask | null;
  retryTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  clearCompleted: () => void;
};

const ComicImageTaskQueueContext = createContext<ComicImageTaskQueueContextValue | null>(null);
const COMIC_TASK_HISTORY_LIMIT = 40;
const COMIC_TASK_POLL_INTERVAL_MS = 3000;

function formatPageLabel(pageNumber: number) {
  return `Page ${String(pageNumber).padStart(2, "0")}`;
}

function createTaskId(kind: ComicImageTaskKind, episodeId: string, pageNumber: number) {
  return `${kind}-${episodeId}-${pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTaskSortTime(task: ComicImageTask) {
  return task.completedAt || task.createdAt;
}

function isActiveTask(task: ComicImageTask) {
  return task.status === "queued" || task.status === "running";
}

function isComicImageTask(value: unknown): value is ComicImageTask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const task = value as Partial<ComicImageTask>;
  return (
    typeof task.id === "string" &&
    typeof task.kind === "string" &&
    typeof task.label === "string" &&
    typeof task.status === "string" &&
    typeof task.createdAt === "number"
  );
}

export function ComicImageTaskQueueProvider({
  children,
  maxConcurrent = 5
}: {
  children: ReactNode;
  maxConcurrent?: number;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<ComicImageTask[]>([]);
  const tasksRef = useRef<ComicImageTask[]>([]);
  const dismissedTaskIds = useRef(new Set<string>());
  const refreshInFlight = useRef(false);
  const runnerInFlight = useRef(false);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const mergeTask = useCallback((incomingTask: ComicImageTask, optimisticId?: string) => {
    setTasks((currentTasks) => {
      const dismissed = dismissedTaskIds.current;
      const nextTasks = currentTasks
        .filter((task) => task.id !== optimisticId && task.id !== incomingTask.id)
        .concat(incomingTask)
        .filter((task) => !dismissed.has(task.id))
        .sort((left, right) => getTaskSortTime(left) - getTaskSortTime(right))
        .slice(-COMIC_TASK_HISTORY_LIMIT);

      tasksRef.current = nextTasks;
      return nextTasks;
    });
  }, []);

  const refreshTasks = useCallback(async () => {
    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;

    try {
      const response = await fetch(`/api/admin/comic/tasks?limit=${COMIC_TASK_HISTORY_LIMIT}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const nextTasks = Array.isArray(payload?.tasks)
        ? payload.tasks.filter(isComicImageTask)
        : [];
      const dismissed = dismissedTaskIds.current;

      const visibleTasks = nextTasks
        .filter((task) => !dismissed.has(task.id))
        .sort((left, right) => getTaskSortTime(left) - getTaskSortTime(right));

      tasksRef.current = visibleTasks;
      setTasks(visibleTasks);
    } finally {
      refreshInFlight.current = false;
    }
  }, []);

  const kickRunner = useCallback(async () => {
    if (runnerInFlight.current || !tasksRef.current.some((task) => task.status === "queued")) {
      return;
    }

    runnerInFlight.current = true;

    try {
      await fetch("/api/admin/comic/tasks/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          limit: Math.max(1, Math.min(maxConcurrent, 5))
        })
      });
      await refreshTasks();
      router.refresh();
    } finally {
      runnerInFlight.current = false;
    }
  }, [maxConcurrent, refreshTasks, router]);

  useEffect(() => {
    void refreshTasks();

    const intervalId = window.setInterval(() => {
      void refreshTasks();
      void kickRunner();
    }, COMIC_TASK_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshTasks, kickRunner]);

  const enqueueServerTask = useCallback(
    (input: {
      kind: ComicImageTaskKind;
      episodeId?: string;
      pageNumber?: number;
      label: string;
      payload: Record<string, unknown>;
      duplicateMatch: (task: ComicImageTask) => boolean;
      optimisticFields?: Partial<ComicImageTask>;
    }) => {
      const activeTask = tasksRef.current.find(
        (task) => input.duplicateMatch(task) && isActiveTask(task)
      );

      if (activeTask) {
        return activeTask.id;
      }

      const episodeId = input.episodeId || "";
      const pageNumber = input.pageNumber || 0;
      const optimisticId = createTaskId(input.kind, episodeId || input.label, pageNumber);
      const optimisticTask: ComicImageTask = {
        id: optimisticId,
        kind: input.kind,
        episodeId,
        pageNumber,
        label: input.label,
        status: "queued",
        createdAt: Date.now(),
        ...input.optimisticFields
      };

      mergeTask(optimisticTask);

      void fetch("/api/admin/comic/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          taskType: input.kind,
          label: input.label,
          payload: input.payload
        })
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

          if (!response.ok || !isComicImageTask(payload?.task)) {
            throw new Error(
              typeof payload?.message === "string" ? payload.message : "Task could not be queued."
            );
          }

          mergeTask(payload.task, optimisticId);
          await refreshTasks();
          void kickRunner();
        })
        .catch((error) => {
          mergeTask(
            {
              ...optimisticTask,
              status: "failed",
              completedAt: Date.now(),
              message: `${input.label} failed to queue.`,
              errorMessage: error instanceof Error ? error.message : "Task could not be queued."
            },
            optimisticId
          );
        });

      return optimisticId;
    },
    [kickRunner, mergeTask, refreshTasks]
  );

  const enqueue = useCallback(
    (input: { episodeId: string; pageNumber: number; label?: string }) => {
      const label = input.label || formatPageLabel(input.pageNumber);
      return enqueueServerTask({
        kind: "generate",
        episodeId: input.episodeId,
        pageNumber: input.pageNumber,
        label,
        payload: {
          episodeId: input.episodeId,
          pageNumber: input.pageNumber
        },
        duplicateMatch: (task) =>
          task.kind === "generate" &&
          task.episodeId === input.episodeId &&
          task.pageNumber === input.pageNumber
      });
    },
    [enqueueServerTask]
  );

  const enqueueEdit = useCallback(
    (input: {
      sourceAssetId: string;
      episodeId: string;
      pageNumber: number;
      editInstruction: string;
      label?: string;
    }) => {
      const editInstruction = input.editInstruction.trim();
      const label = input.label || formatPageLabel(input.pageNumber);
      return enqueueServerTask({
        kind: "edit",
        episodeId: input.episodeId,
        pageNumber: input.pageNumber,
        label,
        payload: {
          assetId: input.sourceAssetId,
          sourceAssetId: input.sourceAssetId,
          episodeId: input.episodeId,
          pageNumber: input.pageNumber,
          editInstruction
        },
        optimisticFields: {
          sourceAssetId: input.sourceAssetId,
          editInstruction
        },
        duplicateMatch: (task) =>
          task.kind === "edit" &&
          task.sourceAssetId === input.sourceAssetId &&
          task.editInstruction === editInstruction
      });
    },
    [enqueueServerTask]
  );

  const enqueuePromptPackage = useCallback((input: { episodeId: string; label?: string }) => {
    const label = input.label || "Prompt package";
    return enqueueServerTask({
      kind: "prompt-package",
      episodeId: input.episodeId,
      pageNumber: 0,
      label,
      payload: {
        episodeId: input.episodeId
      },
      duplicateMatch: (task) =>
        task.kind === "prompt-package" && task.episodeId === input.episodeId
    });
  }, [enqueueServerTask]);

  const enqueuePromptRevision = useCallback(
    (input: {
      episodeId: string;
      pageNumber: number;
      promptSuggestion: string;
      label?: string;
    }) => {
      const promptSuggestion = input.promptSuggestion.trim();
      const label = input.label || `Revise ${formatPageLabel(input.pageNumber)} prompt`;
      return enqueueServerTask({
        kind: "prompt-revision",
        episodeId: input.episodeId,
        pageNumber: input.pageNumber,
        label,
        payload: {
          episodeId: input.episodeId,
          pageNumber: input.pageNumber,
          promptSuggestion
        },
        optimisticFields: {
          promptSuggestion
        },
        duplicateMatch: (task) =>
          task.kind === "prompt-revision" &&
          task.episodeId === input.episodeId &&
          task.pageNumber === input.pageNumber &&
          task.promptSuggestion === promptSuggestion
      });
    },
    [enqueueServerTask]
  );

  const enqueueOutlineTask = useCallback(
    (input: {
      taskType: string;
      targetId: string;
      revisionNotes?: string;
      label?: string;
    }) => {
      const revisionNotes = input.revisionNotes?.trim() || "";
      const label = input.label || "Outline task";
      return enqueueServerTask({
        kind: "outline",
        label,
        payload: {
          taskType: input.taskType,
          targetId: input.targetId,
          revisionNotes
        },
        optimisticFields: {
          outlineTaskType: input.taskType,
          targetId: input.targetId,
          revisionNotes
        },
        duplicateMatch: (task) =>
          task.kind === "outline" &&
          task.outlineTaskType === input.taskType &&
          task.targetId === input.targetId &&
          task.revisionNotes === revisionNotes
      });
    },
    [enqueueServerTask]
  );

  const enqueueCharacterLockRevision = useCallback(
    (input: {
      characterId: string;
      revisionInstruction: string;
      label?: string;
    }) => {
      const revisionInstruction = input.revisionInstruction.trim();
      const label = input.label || "Character lock revision";
      return enqueueServerTask({
        kind: "character-lock-revision",
        label,
        payload: {
          id: input.characterId,
          characterId: input.characterId,
          revisionInstruction
        },
        optimisticFields: {
          characterId: input.characterId,
          targetId: input.characterId,
          revisionInstruction
        },
        duplicateMatch: (task) =>
          task.kind === "character-lock-revision" &&
          task.characterId === input.characterId &&
          task.revisionInstruction === revisionInstruction
      });
    },
    [enqueueServerTask]
  );

  const enqueueSceneLockRevision = useCallback(
    (input: {
      sceneId: string;
      revisionInstruction: string;
      label?: string;
    }) => {
      const revisionInstruction = input.revisionInstruction.trim();
      const label = input.label || "Scene lock revision";
      return enqueueServerTask({
        kind: "scene-lock-revision",
        label,
        payload: {
          id: input.sceneId,
          sceneId: input.sceneId,
          revisionInstruction
        },
        optimisticFields: {
          sceneId: input.sceneId,
          targetId: input.sceneId,
          revisionInstruction
        },
        duplicateMatch: (task) =>
          task.kind === "scene-lock-revision" &&
          task.sceneId === input.sceneId &&
          task.revisionInstruction === revisionInstruction
      });
    },
    [enqueueServerTask]
  );

  const enqueueChinesePageVersion = useCallback(
    (input: {
      assetId: string;
      episodeId: string;
      pageNumber: number;
      label?: string;
    }) => {
      const label = input.label || `Chinese ${formatPageLabel(input.pageNumber)}`;
      return enqueueServerTask({
        kind: "chinese-page-version",
        episodeId: input.episodeId,
        pageNumber: input.pageNumber,
        label,
        payload: {
          assetId: input.assetId,
          sourceAssetId: input.assetId,
          episodeId: input.episodeId,
          pageNumber: input.pageNumber
        },
        optimisticFields: {
          sourceAssetId: input.assetId
        },
        duplicateMatch: (task) =>
          task.kind === "chinese-page-version" && task.sourceAssetId === input.assetId
      });
    },
    [enqueueServerTask]
  );

  const getLatestPageTask = useCallback((episodeId: string, pageNumber: number) => {
    const pageTasks = tasksRef.current
      .filter((task) => task.episodeId === episodeId && task.pageNumber === pageNumber)
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left));

    return pageTasks[0] || null;
  }, []);

  const retryTask = useCallback(
    (taskId: string) => {
      void fetch(`/api/admin/comic/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "retry"
        })
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

          if (response.ok && isComicImageTask(payload?.task)) {
            mergeTask(payload.task);
          }

          await refreshTasks();
          void kickRunner();
        })
        .catch(() => undefined);
    },
    [kickRunner, mergeTask, refreshTasks]
  );

  const cancelTask = useCallback(
    (taskId: string) => {
      void fetch(`/api/admin/comic/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "cancel"
        })
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

          if (response.ok && isComicImageTask(payload?.task)) {
            mergeTask(payload.task);
          }

          await refreshTasks();
        })
        .catch(() => undefined);
    },
    [mergeTask, refreshTasks]
  );

  const clearCompleted = useCallback(() => {
    const completedIds = tasksRef.current
      .filter((task) => task.status === "success" || task.status === "failed" || task.status === "cancelled")
      .map((task) => task.id);

    completedIds.forEach((taskId) => dismissedTaskIds.current.add(taskId));
    setTasks((currentTasks) => {
      const activeTasks = currentTasks.filter(isActiveTask);
      tasksRef.current = activeTasks;
      return activeTasks;
    });
  }, []);

  const value = useMemo(
    () => ({
      maxConcurrent,
      tasks,
      enqueue,
      enqueueEdit,
      enqueuePromptPackage,
      enqueuePromptRevision,
      enqueueOutlineTask,
      enqueueCharacterLockRevision,
      enqueueSceneLockRevision,
      enqueueChinesePageVersion,
      getLatestPageTask,
      retryTask,
      cancelTask,
      clearCompleted
    }),
    [
      maxConcurrent,
      tasks,
      enqueue,
      enqueueEdit,
      enqueuePromptPackage,
      enqueuePromptRevision,
      enqueueOutlineTask,
      enqueueCharacterLockRevision,
      enqueueSceneLockRevision,
      enqueueChinesePageVersion,
      getLatestPageTask,
      retryTask,
      cancelTask,
      clearCompleted
    ]
  );

  return (
    <ComicImageTaskQueueContext.Provider value={value}>
      {children}
      <ComicImageTaskQueuePanel />
    </ComicImageTaskQueueContext.Provider>
  );
}

function useComicImageTaskQueue() {
  const context = useContext(ComicImageTaskQueueContext);

  if (!context) {
    throw new Error("ComicImageTaskQueueProvider is required.");
  }

  return context;
}

export function ComicGenerateImageQueueButton({
  episodeId,
  pageNumber,
  className = "button button--secondary",
  idleLabel = "Generate draft image"
}: {
  episodeId: string;
  pageNumber: number;
  className?: string;
  idleLabel?: string;
}) {
  const { enqueue, tasks } = useComicImageTaskQueue();
  const task =
    [...tasks]
      .filter(
        (candidate) =>
          candidate.kind === "generate" &&
          candidate.episodeId === episodeId &&
          candidate.pageNumber === pageNumber
      )
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;
  const isActive = task?.status === "queued" || task?.status === "running";
  const label =
    task?.status === "queued"
      ? "Queued..."
      : task?.status === "running"
        ? "Creating..."
        : task?.status === "success"
          ? "Create another draft"
          : task?.status === "failed"
            ? "Retry draft image"
            : idleLabel;

  return (
    <button
      type="button"
      className={className}
      disabled={isActive}
      aria-busy={task?.status === "running"}
      onClick={() => enqueue({ episodeId, pageNumber, label: formatPageLabel(pageNumber) })}
    >
      {label}
    </button>
  );
}

export function ComicGenerateAllImagesQueueButton({
  episodeId,
  pageNumbers,
  className = "button button--secondary",
  idleLabel = "Generate all draft images"
}: {
  episodeId: string;
  pageNumbers: number[];
  className?: string;
  idleLabel?: string;
}) {
  const { enqueue, tasks } = useComicImageTaskQueue();
  const uniquePageNumbers = Array.from(new Set(pageNumbers)).filter((pageNumber) => pageNumber > 0);
  const activeCount = tasks.filter(
    (task) =>
      task.kind === "generate" &&
      task.episodeId === episodeId &&
      uniquePageNumbers.includes(task.pageNumber) &&
      (task.status === "queued" || task.status === "running")
  ).length;

  return (
    <button
      type="button"
      className={className}
      disabled={uniquePageNumbers.length === 0}
      onClick={() => {
        uniquePageNumbers.forEach((pageNumber) =>
          enqueue({ episodeId, pageNumber, label: formatPageLabel(pageNumber) })
        );
      }}
    >
      {activeCount > 0 ? `${activeCount} page images queued` : idleLabel}
    </button>
  );
}

export function ComicChinesePageVersionQueueButton({
  sourceAssetId,
  episodeId,
  pageNumber,
  hasApprovedChineseAsset = false,
  className = "button button--secondary"
}: {
  sourceAssetId: string;
  episodeId: string;
  pageNumber: number;
  hasApprovedChineseAsset?: boolean;
  className?: string;
}) {
  const { enqueueChinesePageVersion, tasks } = useComicImageTaskQueue();
  const task =
    [...tasks]
      .filter(
        (candidate) =>
          candidate.kind === "chinese-page-version" && candidate.sourceAssetId === sourceAssetId
      )
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;
  const isActive = task?.status === "queued" || task?.status === "running";
  const label =
    task?.status === "queued"
      ? "Queued..."
      : task?.status === "running"
        ? "Creating Chinese..."
        : task?.status === "success"
          ? "Create another Chinese draft"
          : task?.status === "failed"
            ? "Retry Chinese version"
            : hasApprovedChineseAsset
              ? "Create Chinese Draft"
              : "Create Chinese Version";

  return (
    <button
      type="button"
      className={className}
      disabled={isActive}
      aria-busy={task?.status === "running"}
      onClick={() =>
        enqueueChinesePageVersion({
          assetId: sourceAssetId,
          episodeId,
          pageNumber,
          label: `Chinese ${formatPageLabel(pageNumber)}`
        })
      }
    >
      {label}
    </button>
  );
}

export function ComicGenerateAllChinesePagesQueueButton({
  pages,
  className = "button button--secondary",
  idleLabel = "Create missing Chinese drafts"
}: {
  pages: Array<{
    sourceAssetId: string;
    episodeId: string;
    pageNumber: number;
  }>;
  className?: string;
  idleLabel?: string;
}) {
  const { enqueueChinesePageVersion, tasks } = useComicImageTaskQueue();
  const activeCount = tasks.filter(
    (task) =>
      task.kind === "chinese-page-version" &&
      pages.some((page) => page.sourceAssetId === task.sourceAssetId) &&
      (task.status === "queued" || task.status === "running")
  ).length;

  return (
    <button
      type="button"
      className={className}
      disabled={pages.length === 0}
      onClick={() => {
        pages.forEach((page) =>
          enqueueChinesePageVersion({
            assetId: page.sourceAssetId,
            episodeId: page.episodeId,
            pageNumber: page.pageNumber,
            label: `Chinese ${formatPageLabel(page.pageNumber)}`
          })
        );
      }}
    >
      {activeCount > 0 ? `${activeCount} Chinese tasks queued` : idleLabel}
    </button>
  );
}

export function ComicEditImageQueueForm({
  sourceAssetId,
  episodeId,
  pageNumber
}: {
  sourceAssetId: string;
  episodeId: string;
  pageNumber: number;
}) {
  const { enqueueEdit, tasks } = useComicImageTaskQueue();
  const [editInstruction, setEditInstruction] = useState("");
  const [notice, setNotice] = useState("");
  const activeEditCount = tasks.filter(
    (task) =>
      task.kind === "edit" &&
      task.sourceAssetId === sourceAssetId &&
      (task.status === "queued" || task.status === "running")
  ).length;
  const trimmedInstruction = editInstruction.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedInstruction) {
      setNotice("Enter an edit instruction first.");
      return;
    }

    enqueueEdit({
      sourceAssetId,
      episodeId,
      pageNumber,
      editInstruction: trimmedInstruction,
      label: `Edit ${formatPageLabel(pageNumber)}`
    });
    setEditInstruction("");
    setNotice("Added to Comic tasks.");
  }

  return (
    <form onSubmit={handleSubmit} className="admin-comic-page-edit-form">
      <div className="field">
        <label htmlFor={`page-edit-${sourceAssetId}`}>Edit page</label>
        <textarea
          id={`page-edit-${sourceAssetId}`}
          name="editInstruction"
          rows={3}
          placeholder="Describe a small image change to make from this candidate..."
          value={editInstruction}
          onChange={(event) => {
            setEditInstruction(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
          required
        />
      </div>
      <button type="submit" className="button button--secondary" disabled={!trimmedInstruction}>
        {activeEditCount > 0 ? "Queue another edit" : "Create edited draft"}
      </button>
      {notice ? <span className="form-note">{notice}</span> : null}
    </form>
  );
}

export function ComicGeneratePromptPackageQueueButton({
  episodeId,
  className = "button button--secondary",
  idleLabel = "Generate prompt package",
  disabled = false,
  taskLabel = "Prompt package"
}: {
  episodeId: string;
  className?: string;
  idleLabel?: string;
  disabled?: boolean;
  taskLabel?: string;
}) {
  const { enqueuePromptPackage, tasks } = useComicImageTaskQueue();
  const task =
    [...tasks]
      .filter(
        (candidate) =>
          candidate.kind === "prompt-package" && candidate.episodeId === episodeId
      )
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;
  const isActive = task?.status === "queued" || task?.status === "running";
  const label =
    task?.status === "queued"
      ? "Queued..."
      : task?.status === "running"
        ? "Generating prompts..."
        : task?.status === "success"
          ? "Regenerate prompt package"
          : task?.status === "failed"
            ? "Retry prompt package"
            : idleLabel;

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || isActive}
      aria-busy={task?.status === "running"}
      onClick={() => enqueuePromptPackage({ episodeId, label: taskLabel })}
    >
      {label}
    </button>
  );
}

export function ComicRevisePromptQueueForm({
  episodeId,
  pageNumber
}: {
  episodeId: string;
  pageNumber: number;
}) {
  const { enqueuePromptRevision, tasks } = useComicImageTaskQueue();
  const [promptSuggestion, setPromptSuggestion] = useState("");
  const [notice, setNotice] = useState("");
  const activeRevisionCount = tasks.filter(
    (task) =>
      task.kind === "prompt-revision" &&
      task.episodeId === episodeId &&
      task.pageNumber === pageNumber &&
      (task.status === "queued" || task.status === "running")
  ).length;
  const trimmedSuggestion = promptSuggestion.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedSuggestion) {
      setNotice("Enter a prompt suggestion first.");
      return;
    }

    enqueuePromptRevision({
      episodeId,
      pageNumber,
      promptSuggestion: trimmedSuggestion,
      label: `Revise ${formatPageLabel(pageNumber)} prompt`
    });
    setPromptSuggestion("");
    setNotice("Added to Comic tasks.");
  }

  return (
    <form onSubmit={handleSubmit} className="admin-comic-prompt-suggestion-form">
      <div className="field">
        <label htmlFor={`prompt-suggestion-${episodeId}-${pageNumber}`}>
          Prompt suggestion
        </label>
        <textarea
          id={`prompt-suggestion-${episodeId}-${pageNumber}`}
          name="promptSuggestion"
          rows={3}
          placeholder="Describe what should change in Chinese or English..."
          value={promptSuggestion}
          onChange={(event) => {
            setPromptSuggestion(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
          required
        />
      </div>
      <button type="submit" className="button button--ghost" disabled={!trimmedSuggestion}>
        {activeRevisionCount > 0 ? "Queue another prompt update" : "Update page prompt"}
      </button>
      {notice ? <span className="form-note">{notice}</span> : null}
    </form>
  );
}

export function ComicCharacterLockRevisionQueueForm({
  characterId,
  characterName
}: {
  characterId: string;
  characterName: string;
}) {
  const { enqueueCharacterLockRevision, tasks } = useComicImageTaskQueue();
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [notice, setNotice] = useState("");
  const trimmedInstruction = revisionInstruction.trim();
  const activeRevisionCount = tasks.filter(
    (task) =>
      task.kind === "character-lock-revision" &&
      task.characterId === characterId &&
      (task.status === "queued" || task.status === "running")
  ).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedInstruction) {
      setNotice("Enter a revision instruction first.");
      return;
    }

    enqueueCharacterLockRevision({
      characterId,
      revisionInstruction: trimmedInstruction,
      label: `Character lock: ${characterName}`
    });
    setRevisionInstruction("");
    setNotice("Added to Comic tasks.");
  }

  return (
    <form onSubmit={handleSubmit} className="admin-comic-lock-revision-form">
      <div className="field">
        <label htmlFor={`comic-character-lock-revision-${characterId}`}>Revision instruction</label>
        <textarea
          id={`comic-character-lock-revision-${characterId}`}
          name="revisionInstruction"
          rows={5}
          placeholder="Describe exactly what should change in the locked character profile..."
          value={revisionInstruction}
          onChange={(event) => {
            setRevisionInstruction(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
          required
        />
      </div>
      <button type="submit" className="button button--primary" disabled={!trimmedInstruction}>
        {activeRevisionCount > 0 ? "Queue another lock update" : "Update lock with AI"}
      </button>
      {notice ? <span className="form-note">{notice}</span> : null}
    </form>
  );
}

export function ComicSceneLockRevisionQueueForm({
  sceneId,
  sceneName
}: {
  sceneId: string;
  sceneName: string;
}) {
  const { enqueueSceneLockRevision, tasks } = useComicImageTaskQueue();
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [notice, setNotice] = useState("");
  const trimmedInstruction = revisionInstruction.trim();
  const activeRevisionCount = tasks.filter(
    (task) =>
      task.kind === "scene-lock-revision" &&
      task.sceneId === sceneId &&
      (task.status === "queued" || task.status === "running")
  ).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedInstruction) {
      setNotice("Enter a revision instruction first.");
      return;
    }

    enqueueSceneLockRevision({
      sceneId,
      revisionInstruction: trimmedInstruction,
      label: `Scene lock: ${sceneName}`
    });
    setRevisionInstruction("");
    setNotice("Added to Comic tasks.");
  }

  return (
    <form onSubmit={handleSubmit} className="admin-comic-lock-revision-form">
      <div className="field">
        <label htmlFor={`comic-scene-lock-revision-${sceneId}`}>Revision instruction</label>
        <textarea
          id={`comic-scene-lock-revision-${sceneId}`}
          name="revisionInstruction"
          rows={5}
          placeholder="Describe exactly what should change in the locked scene profile..."
          value={revisionInstruction}
          onChange={(event) => {
            setRevisionInstruction(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
          required
        />
      </div>
      <button type="submit" className="button button--primary" disabled={!trimmedInstruction}>
        {activeRevisionCount > 0 ? "Queue another lock update" : "Update lock with AI"}
      </button>
      {notice ? <span className="form-note">{notice}</span> : null}
    </form>
  );
}

export function ComicOutlineQueueForm({
  taskType,
  targetId,
  taskLabel,
  idleLabel,
  disabled = false,
  disabledReason,
  showRevisionNotes = true
}: {
  taskType: string;
  targetId: string;
  taskLabel: string;
  idleLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  showRevisionNotes?: boolean;
}) {
  const { enqueueOutlineTask, tasks } = useComicImageTaskQueue();
  const [revisionNotes, setRevisionNotes] = useState("");
  const [notice, setNotice] = useState("");
  const trimmedNotes = revisionNotes.trim();
  const task =
    [...tasks]
      .filter(
        (candidate) =>
          candidate.kind === "outline" &&
          candidate.outlineTaskType === taskType &&
          candidate.targetId === targetId
      )
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;
  const isActive = task?.status === "queued" || task?.status === "running";
  const label =
    task?.status === "queued"
      ? "Queued..."
      : task?.status === "running"
        ? "Working..."
        : task?.status === "success"
          ? idleLabel
          : task?.status === "failed"
            ? `Retry ${idleLabel}`
            : idleLabel;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    enqueueOutlineTask({
      taskType,
      targetId,
      revisionNotes: trimmedNotes,
      label: taskLabel
    });
    setRevisionNotes("");
    setNotice("Added to Comic tasks.");
  }

  return (
    <form onSubmit={handleSubmit} className="admin-comic-outline-form">
      {showRevisionNotes ? (
        <div className="field">
          <label htmlFor={`outline-task-${taskType}-${targetId}`}>修改需求</label>
          <textarea
            id={`outline-task-${taskType}-${targetId}`}
            name="revisionNotes"
            rows={3}
            placeholder="可留空；也可以写：节奏更轻松、加强 Nia 的动机、补足第 3 集的反转..."
            value={revisionNotes}
            onChange={(event) => {
              setRevisionNotes(event.target.value);
              if (notice) {
                setNotice("");
              }
            }}
          />
        </div>
      ) : null}
      <div className="stack-row">
        <button
          type="submit"
          className="button button--primary"
          disabled={disabled || isActive}
          aria-busy={task?.status === "running"}
        >
          {label}
        </button>
        {disabled && disabledReason ? <span className="form-note">{disabledReason}</span> : null}
        {notice ? <span className="form-note">{notice}</span> : null}
      </div>
    </form>
  );
}

type ComicOutlineTaskMultiAction = {
  actionType?: "outline";
  taskType: string;
  targetId: string;
  taskLabel: string;
  idleLabel: string;
  includeRevisionNotes?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

type ComicOutlineBatchTask = {
  taskType: string;
  targetId: string;
  taskLabel: string;
};

type ComicOutlineBatchMultiAction = {
  actionType: "outline-batch";
  tasks: ComicOutlineBatchTask[];
  idleLabel: string;
  includeRevisionNotes?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

type ComicPromptTaskMultiAction = {
  actionType: "prompt-package";
  episodeId: string;
  taskLabel: string;
  idleLabel: string;
  disabled?: boolean;
  disabledReason?: string;
};

type ComicLinkMultiAction = {
  actionType: "link";
  href: string;
  idleLabel: string;
  className?: string;
};

type ComicOutlineMultiAction =
  | ComicOutlineTaskMultiAction
  | ComicOutlineBatchMultiAction
  | ComicPromptTaskMultiAction
  | ComicLinkMultiAction;

function isComicLinkMultiAction(action: ComicOutlineMultiAction): action is ComicLinkMultiAction {
  return action.actionType === "link";
}

function isComicPromptTaskMultiAction(
  action: ComicOutlineMultiAction
): action is ComicPromptTaskMultiAction {
  return action.actionType === "prompt-package";
}

function isComicOutlineBatchMultiAction(
  action: ComicOutlineMultiAction
): action is ComicOutlineBatchMultiAction {
  return action.actionType === "outline-batch";
}

function isComicQueueMultiAction(
  action: ComicOutlineMultiAction
): action is ComicOutlineTaskMultiAction | ComicOutlineBatchMultiAction | ComicPromptTaskMultiAction {
  return !isComicLinkMultiAction(action);
}

export function ComicOutlineMultiActionForm({
  textareaId,
  actions
}: {
  textareaId: string;
  actions: ComicOutlineMultiAction[];
}) {
  const { enqueueOutlineTask, enqueuePromptPackage, tasks } = useComicImageTaskQueue();
  const [revisionNotes, setRevisionNotes] = useState("");
  const [notice, setNotice] = useState("");
  const trimmedNotes = revisionNotes.trim();
  const disabledActions = actions.filter(
    (
      action
    ): action is ComicOutlineTaskMultiAction | ComicOutlineBatchMultiAction | ComicPromptTaskMultiAction =>
      isComicQueueMultiAction(action) && Boolean(action.disabled && action.disabledReason)
  );

  function getActionTasks(action: ComicOutlineMultiAction) {
    if (isComicLinkMultiAction(action)) {
      return [];
    }

    if (isComicPromptTaskMultiAction(action)) {
      const task =
        [...tasks]
          .filter(
            (candidate) =>
              candidate.kind === "prompt-package" && candidate.episodeId === action.episodeId
          )
          .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;

      return task ? [task] : [];
    }

    if (isComicOutlineBatchMultiAction(action)) {
      return action.tasks
        .map((batchTask) =>
          [...tasks]
            .filter(
              (candidate) =>
                candidate.kind === "outline" &&
                candidate.outlineTaskType === batchTask.taskType &&
                candidate.targetId === batchTask.targetId
            )
            .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null
        )
        .filter((task): task is ComicImageTask => Boolean(task));
    }

    const task =
      [...tasks]
        .filter(
          (candidate) =>
            candidate.kind === "outline" &&
            candidate.outlineTaskType === action.taskType &&
            candidate.targetId === action.targetId
        )
        .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;

    return task ? [task] : [];
  }

  function getActionLabel(action: ComicOutlineMultiAction) {
    if (isComicLinkMultiAction(action)) {
      return action.idleLabel;
    }

    const actionTasks = getActionTasks(action);
    const activeCount = actionTasks.filter(
      (task) => task.status === "queued" || task.status === "running"
    ).length;
    const failedCount = actionTasks.filter((task) => task.status === "failed").length;

    if (isComicOutlineBatchMultiAction(action) && activeCount > 0) {
      return `${activeCount}/${action.tasks.length} working...`;
    }

    if (isComicOutlineBatchMultiAction(action) && failedCount > 0) {
      return `Retry ${action.idleLabel}`;
    }

    const task = actionTasks[0];

    if (task?.status === "queued") {
      return "Queued...";
    }

    if (task?.status === "running") {
      return "Working...";
    }

    if (task?.status === "failed") {
      return `Retry ${action.idleLabel}`;
    }

    return action.idleLabel;
  }

  function handleAction(action: ComicOutlineMultiAction) {
    if (isComicLinkMultiAction(action)) {
      return;
    }

    if (isComicPromptTaskMultiAction(action)) {
      enqueuePromptPackage({
        episodeId: action.episodeId,
        label: action.taskLabel
      });
      setNotice("Added to Comic tasks.");
      return;
    }

    if (isComicOutlineBatchMultiAction(action)) {
      action.tasks.forEach((batchTask) => {
        enqueueOutlineTask({
          taskType: batchTask.taskType,
          targetId: batchTask.targetId,
          revisionNotes: action.includeRevisionNotes ? trimmedNotes : "",
          label: batchTask.taskLabel
        });
      });
      setNotice(`Added ${action.tasks.length} Comic tasks.`);
      return;
    }

    enqueueOutlineTask({
      taskType: action.taskType,
      targetId: action.targetId,
      revisionNotes: action.includeRevisionNotes ? trimmedNotes : "",
      label: action.taskLabel
    });
    setNotice("Added to Comic tasks.");
  }

  return (
    <form className="admin-comic-outline-form" onSubmit={(event) => event.preventDefault()}>
      <div className="field">
        <label htmlFor={textareaId}>修改需求</label>
        <textarea
          id={textareaId}
          name="revisionNotes"
          rows={3}
          placeholder="可留空；也可以写：节奏更轻松、加强 Nia 的动机、补足第 3 集的反转..."
          value={revisionNotes}
          onChange={(event) => {
            setRevisionNotes(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
        />
      </div>
      <div className="admin-comic-outline-button-row">
        {actions.map((action) => {
          if (isComicLinkMultiAction(action)) {
            return (
              <a
                key={`link-${action.href}`}
                href={action.href}
                className={action.className || "button button--secondary"}
              >
                {getActionLabel(action)}
              </a>
            );
          }

          const actionTasks = getActionTasks(action);
          const isActive = actionTasks.some(
            (task) => task.status === "queued" || task.status === "running"
          );
          const isRunning = actionTasks.some((task) => task.status === "running");
          const disabled = Boolean(action.disabled || isActive);
          const actionKey = isComicPromptTaskMultiAction(action)
            ? `prompt-${action.episodeId}`
            : isComicOutlineBatchMultiAction(action)
              ? `outline-batch-${action.idleLabel}`
              : `${action.taskType}-${action.targetId}`;

          return (
            <button
              key={actionKey}
              type="button"
              className="button button--primary"
              disabled={disabled}
              title={action.disabled ? action.disabledReason : undefined}
              aria-busy={isRunning}
              onClick={() => handleAction(action)}
            >
              {getActionLabel(action)}
            </button>
          );
        })}
      </div>
      {disabledActions.length > 0 ? (
        <div className="admin-comic-outline-disabled-notes">
          {disabledActions.map((action) => (
            <span
              key={
                isComicPromptTaskMultiAction(action)
                  ? `prompt-${action.episodeId}-reason`
                  : isComicOutlineBatchMultiAction(action)
                    ? `outline-batch-${action.idleLabel}-reason`
                  : `${action.taskType}-${action.targetId}-reason`
              }
              className="form-note"
            >
              {action.idleLabel}: {action.disabledReason}
            </span>
          ))}
        </div>
      ) : null}
      {notice ? <span className="form-note">{notice}</span> : null}
    </form>
  );
}

function ComicImageTaskQueuePanel() {
  const { tasks, maxConcurrent, retryTask, cancelTask, clearCompleted } = useComicImageTaskQueue();

  if (tasks.length === 0) {
    return null;
  }

  const runningCount = tasks.filter((task) => task.status === "running").length;
  const queuedCount = tasks.filter((task) => task.status === "queued").length;
  const visibleTasks = [...tasks]
    .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))
    .slice(0, 8);
  const hasCompleted = tasks.some(
    (task) => task.status === "success" || task.status === "failed" || task.status === "cancelled"
  );

  return (
    <aside className="admin-comic-task-panel" aria-live="polite">
      <div className="admin-comic-task-panel__header">
        <div>
          <p className="eyebrow">Comic tasks</p>
          <strong>
            {runningCount} / {maxConcurrent} running
          </strong>
          {queuedCount > 0 ? <span className="form-note">{queuedCount} queued</span> : null}
        </div>
        {hasCompleted ? (
          <button type="button" className="button button--ghost" onClick={clearCompleted}>
            Clear done
          </button>
        ) : null}
      </div>
      <div className="admin-comic-task-panel__list">
        {visibleTasks.map((task) => (
          <div key={task.id} className={`admin-comic-task admin-comic-task--${task.status}`}>
            <div>
              <strong>{task.label}</strong>
              <span>{task.message || task.status}</span>
              {task.errorMessage ? <small>{task.errorMessage}</small> : null}
            </div>
            <div className="admin-comic-task__actions">
              <span>{task.status}</span>
              {task.status === "failed" || task.status === "cancelled" ? (
                <button type="button" onClick={() => retryTask(task.id)}>
                  Retry
                </button>
              ) : null}
              {task.status === "queued" || task.status === "running" ? (
                <button type="button" onClick={() => cancelTask(task.id)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
