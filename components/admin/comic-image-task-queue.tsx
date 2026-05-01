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
type ComicImageTaskKind = "generate" | "edit";

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
  getLatestPageTask: (episodeId: string, pageNumber: number) => ComicImageTask | null;
  clearCompleted: () => void;
};

const ComicImageTaskQueueContext = createContext<ComicImageTaskQueueContextValue | null>(null);

function formatPageLabel(pageNumber: number) {
  return `Page ${String(pageNumber).padStart(2, "0")}`;
}

function createTaskId(kind: ComicImageTaskKind, episodeId: string, pageNumber: number) {
  return `${kind}-${episodeId}-${pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTaskSortTime(task: ComicImageTask) {
  return task.completedAt || task.createdAt;
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

  useEffect(() => {
    tasksRef.current = tasks;
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
      const endpoint =
        task.kind === "edit"
          ? "/api/admin/comic/page-image-edit"
          : "/api/admin/comic/page-image-generation";
      const requestBody =
        task.kind === "edit"
          ? {
              assetId: task.sourceAssetId,
              editInstruction: task.editInstruction
            }
          : {
              episodeId: task.episodeId,
              pageNumber: task.pageNumber
            };

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

  const getLatestPageTask = useCallback((episodeId: string, pageNumber: number) => {
    const pageTasks = tasksRef.current
      .filter((task) => task.episodeId === episodeId && task.pageNumber === pageNumber)
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left));

    return pageTasks[0] || null;
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
      getLatestPageTask,
      clearCompleted
    }),
    [maxConcurrent, tasks, enqueue, enqueueEdit, getLatestPageTask, clearCompleted]
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
    setNotice("Added to Image tasks.");
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

function ComicImageTaskQueuePanel() {
  const { tasks, maxConcurrent, clearCompleted } = useComicImageTaskQueue();

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
          <p className="eyebrow">Image tasks</p>
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
            <span>{task.status}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
