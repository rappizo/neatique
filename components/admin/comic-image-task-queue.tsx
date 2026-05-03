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

type ComicImageTaskStatus = "queued" | "running" | "success" | "failed";
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
const COMIC_TASK_STORAGE_KEY = "neatique:comic-ai-task-queue:v1";

function formatPageLabel(pageNumber: number) {
  return `Page ${String(pageNumber).padStart(2, "0")}`;
}

function createTaskId(kind: ComicImageTaskKind, episodeId: string, pageNumber: number) {
  return `${kind}-${episodeId}-${pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTaskSortTime(task: ComicImageTask) {
  return task.completedAt || task.createdAt;
}

function isStoredComicTask(value: unknown): value is ComicImageTask {
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

function normalizeStoredComicTasks(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    const tasks = Array.isArray(parsed) ? parsed.filter(isStoredComicTask) : [];

    return tasks
      .map((task) =>
        task.status === "running"
          ? {
              ...task,
              status: "failed" as const,
              completedAt: Date.now(),
              message: `${task.label} may still have finished on the server.`,
              errorMessage: "This browser task was interrupted. Refresh the page and retry only if needed."
            }
          : task
      )
      .slice(-30);
  } catch {
    return [];
  }
}

function getComicTaskEndpoint(task: ComicImageTask) {
  switch (task.kind) {
    case "edit":
      return "/api/admin/comic/page-image-edit";
    case "prompt-package":
      return "/api/admin/comic/prompt-package-generation";
    case "prompt-revision":
      return "/api/admin/comic/page-prompt-revision";
    case "outline":
      return "/api/admin/comic/outline-generation";
    case "character-lock-revision":
      return "/api/admin/comic/character-lock-revision";
    case "scene-lock-revision":
      return "/api/admin/comic/scene-lock-revision";
    case "chinese-page-version":
      return "/api/admin/comic/chinese-page-version";
    case "generate":
    default:
      return "/api/admin/comic/page-image-generation";
  }
}

function getComicTaskRequestBody(task: ComicImageTask) {
  switch (task.kind) {
    case "edit":
      return {
        assetId: task.sourceAssetId,
        editInstruction: task.editInstruction
      };
    case "prompt-package":
      return {
        episodeId: task.episodeId
      };
    case "prompt-revision":
      return {
        episodeId: task.episodeId,
        pageNumber: task.pageNumber,
        promptSuggestion: task.promptSuggestion
      };
    case "outline":
      return {
        taskType: task.outlineTaskType,
        targetId: task.targetId,
        revisionNotes: task.revisionNotes
      };
    case "character-lock-revision":
      return {
        id: task.characterId,
        revisionInstruction: task.revisionInstruction
      };
    case "scene-lock-revision":
      return {
        id: task.sceneId,
        revisionInstruction: task.revisionInstruction
      };
    case "chinese-page-version":
      return {
        assetId: task.sourceAssetId
      };
    case "generate":
    default:
      return {
        episodeId: task.episodeId,
        pageNumber: task.pageNumber
      };
  }
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
  const startedTaskIds = useRef(new Set<string>());
  const hasLoadedStoredTasks = useRef(false);

  useEffect(() => {
    if (!hasLoadedStoredTasks.current) {
      hasLoadedStoredTasks.current = true;
      setTasks(normalizeStoredComicTasks(window.localStorage.getItem(COMIC_TASK_STORAGE_KEY)));
      return;
    }

    tasksRef.current = tasks;
    window.localStorage.setItem(
      COMIC_TASK_STORAGE_KEY,
      JSON.stringify(
        [...tasks]
          .sort((left, right) => getTaskSortTime(left) - getTaskSortTime(right))
          .slice(-30)
      )
    );
  }, [tasks]);

  useEffect(() => {
    setTasks((currentTasks) => {
      const runningCount = currentTasks.filter((task) => task.status === "running").length;
      let availableSlots = Math.max(0, maxConcurrent - runningCount);

      if (availableSlots === 0) {
        return currentTasks;
      }

      let changed = false;
      const nextTasks = currentTasks.map((task) => {
        if (task.status !== "queued" || availableSlots === 0) {
          return task;
        }

        availableSlots -= 1;
        changed = true;
        return {
          ...task,
          status: "running" as const
        };
      });

      return changed ? nextTasks : currentTasks;
    });
  }, [tasks, maxConcurrent]);

  useEffect(() => {
    const runnableTasks = tasks.filter(
      (task) => task.status === "running" && !startedTaskIds.current.has(task.id)
    );

    for (const task of runnableTasks) {
      startedTaskIds.current.add(task.id);
      const endpoint = getComicTaskEndpoint(task);
      const requestBody = getComicTaskRequestBody(task);

      void fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          const record = payload && typeof payload === "object" ? (payload as Record<string, any>) : {};
          const ok = Boolean(record.ok) && response.ok;

          setTasks((currentTasks) =>
            currentTasks.map((currentTask) =>
              currentTask.id === task.id
                ? {
                    ...currentTask,
                    status: ok ? "success" : "failed",
                    completedAt: Date.now(),
                    message:
                      typeof record.message === "string"
                        ? record.message
                        : ok
                          ? `${task.label} created.`
                          : `${task.label} failed.`,
                    errorMessage:
                      typeof record.errorMessage === "string"
                        ? record.errorMessage
                        : !ok && typeof record.message === "string"
                          ? record.message
                          : undefined,
                    assetId: typeof record.assetId === "string" ? record.assetId : undefined,
                    imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : undefined
                  }
                : currentTask
            )
          );
          router.refresh();
        })
        .catch((error) => {
          setTasks((currentTasks) =>
            currentTasks.map((currentTask) =>
              currentTask.id === task.id
                ? {
                    ...currentTask,
                    status: "failed",
                    completedAt: Date.now(),
                    message: `${task.label} failed.`,
                    errorMessage:
                      error instanceof Error
                        ? error.message
                        : "The image request could not be completed."
                  }
                : currentTask
            )
          );
        });
    }
  }, [tasks, router]);

  const enqueue = useCallback(
    (input: { episodeId: string; pageNumber: number; label?: string }) => {
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "generate" &&
          task.episodeId === input.episodeId &&
          task.pageNumber === input.pageNumber &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("generate", input.episodeId, input.pageNumber);
      const label = input.label || formatPageLabel(input.pageNumber);

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "generate",
          episodeId: input.episodeId,
          pageNumber: input.pageNumber,
          label,
          status: "queued",
          createdAt: Date.now()
        }
      ]);

      return id;
    },
    []
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
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "edit" &&
          task.sourceAssetId === input.sourceAssetId &&
          task.editInstruction === editInstruction &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("edit", input.episodeId, input.pageNumber);
      const label = input.label || formatPageLabel(input.pageNumber);

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "edit",
          episodeId: input.episodeId,
          pageNumber: input.pageNumber,
          label,
          status: "queued",
          createdAt: Date.now(),
          sourceAssetId: input.sourceAssetId,
          editInstruction
        }
      ]);

      return id;
    },
    []
  );

  const enqueuePromptPackage = useCallback((input: { episodeId: string; label?: string }) => {
    const activeTask = tasksRef.current.find(
      (task) =>
        task.kind === "prompt-package" &&
        task.episodeId === input.episodeId &&
        (task.status === "queued" || task.status === "running")
    );

    if (activeTask) {
      return activeTask.id;
    }

    const id = createTaskId("prompt-package", input.episodeId, 0);
    const label = input.label || "Prompt package";

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id,
        kind: "prompt-package",
        episodeId: input.episodeId,
        pageNumber: 0,
        label,
        status: "queued",
        createdAt: Date.now()
      }
    ]);

    return id;
  }, []);

  const enqueuePromptRevision = useCallback(
    (input: {
      episodeId: string;
      pageNumber: number;
      promptSuggestion: string;
      label?: string;
    }) => {
      const promptSuggestion = input.promptSuggestion.trim();
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "prompt-revision" &&
          task.episodeId === input.episodeId &&
          task.pageNumber === input.pageNumber &&
          task.promptSuggestion === promptSuggestion &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("prompt-revision", input.episodeId, input.pageNumber);
      const label = input.label || `Revise ${formatPageLabel(input.pageNumber)} prompt`;

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "prompt-revision",
          episodeId: input.episodeId,
          pageNumber: input.pageNumber,
          label,
          status: "queued",
          createdAt: Date.now(),
          promptSuggestion
        }
      ]);

      return id;
    },
    []
  );

  const enqueueOutlineTask = useCallback(
    (input: {
      taskType: string;
      targetId: string;
      revisionNotes?: string;
      label?: string;
    }) => {
      const revisionNotes = input.revisionNotes?.trim() || "";
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "outline" &&
          task.outlineTaskType === input.taskType &&
          task.targetId === input.targetId &&
          task.revisionNotes === revisionNotes &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("outline", input.targetId || "outline", 0);
      const label = input.label || "Outline task";

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "outline",
          episodeId: "",
          pageNumber: 0,
          label,
          status: "queued",
          createdAt: Date.now(),
          outlineTaskType: input.taskType,
          targetId: input.targetId,
          revisionNotes
        }
      ]);

      return id;
    },
    []
  );

  const enqueueCharacterLockRevision = useCallback(
    (input: {
      characterId: string;
      revisionInstruction: string;
      label?: string;
    }) => {
      const revisionInstruction = input.revisionInstruction.trim();
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "character-lock-revision" &&
          task.characterId === input.characterId &&
          task.revisionInstruction === revisionInstruction &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("character-lock-revision", input.characterId, 0);
      const label = input.label || "Character lock revision";

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "character-lock-revision",
          episodeId: "",
          pageNumber: 0,
          label,
          status: "queued",
          createdAt: Date.now(),
          characterId: input.characterId,
          revisionInstruction
        }
      ]);

      return id;
    },
    []
  );

  const enqueueSceneLockRevision = useCallback(
    (input: {
      sceneId: string;
      revisionInstruction: string;
      label?: string;
    }) => {
      const revisionInstruction = input.revisionInstruction.trim();
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "scene-lock-revision" &&
          task.sceneId === input.sceneId &&
          task.revisionInstruction === revisionInstruction &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("scene-lock-revision", input.sceneId, 0);
      const label = input.label || "Scene lock revision";

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "scene-lock-revision",
          episodeId: "",
          pageNumber: 0,
          label,
          status: "queued",
          createdAt: Date.now(),
          sceneId: input.sceneId,
          revisionInstruction
        }
      ]);

      return id;
    },
    []
  );

  const enqueueChinesePageVersion = useCallback(
    (input: {
      assetId: string;
      episodeId: string;
      pageNumber: number;
      label?: string;
    }) => {
      const activeTask = tasksRef.current.find(
        (task) =>
          task.kind === "chinese-page-version" &&
          task.sourceAssetId === input.assetId &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId("chinese-page-version", input.episodeId, input.pageNumber);
      const label = input.label || `Chinese ${formatPageLabel(input.pageNumber)}`;

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
          kind: "chinese-page-version",
          episodeId: input.episodeId,
          pageNumber: input.pageNumber,
          label,
          status: "queued",
          createdAt: Date.now(),
          sourceAssetId: input.assetId
        }
      ]);

      return id;
    },
    []
  );

  const getLatestPageTask = useCallback((episodeId: string, pageNumber: number) => {
    const pageTasks = tasksRef.current
      .filter((task) => task.episodeId === episodeId && task.pageNumber === pageNumber)
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left));

    return pageTasks[0] || null;
  }, []);

  const retryTask = useCallback((taskId: string) => {
    setTasks((currentTasks) => {
      const task = currentTasks.find((candidate) => candidate.id === taskId);

      if (!task || task.status !== "failed") {
        return currentTasks;
      }

      return [
        ...currentTasks,
        {
          ...task,
          id: createTaskId(task.kind, task.episodeId || task.targetId || task.sourceAssetId || "task", task.pageNumber),
          status: "queued",
          createdAt: Date.now(),
          completedAt: undefined,
          message: undefined,
          errorMessage: undefined
        }
      ];
    });
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId || task.status !== "queued")
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.status === "queued" || task.status === "running")
    );
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
  disabledReason
}: {
  taskType: string;
  targetId: string;
  taskLabel: string;
  idleLabel: string;
  disabled?: boolean;
  disabledReason?: string;
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
      <div className="field">
        <label htmlFor={`outline-task-${taskType}-${targetId}`}>修改 / 翻译要求</label>
        <textarea
          id={`outline-task-${taskType}-${targetId}`}
          name="revisionNotes"
          rows={3}
          placeholder="可留空；也可以写：节奏更轻松、保留术语英文、加强 Nia 的动机..."
          value={revisionNotes}
          onChange={(event) => {
            setRevisionNotes(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
        />
      </div>
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
  const hasCompleted = tasks.some((task) => task.status === "success" || task.status === "failed");

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
              {task.status === "failed" ? (
                <button type="button" onClick={() => retryTask(task.id)}>
                  Retry
                </button>
              ) : null}
              {task.status === "queued" ? (
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
