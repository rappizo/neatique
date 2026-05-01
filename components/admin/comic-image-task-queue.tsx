"use client";

import {
  createContext,
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

type ComicImageTask = {
  id: string;
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
};

type ComicImageTaskQueueContextValue = {
  maxConcurrent: number;
  tasks: ComicImageTask[];
  enqueue: (input: { episodeId: string; pageNumber: number; label?: string }) => string;
  getLatestPageTask: (episodeId: string, pageNumber: number) => ComicImageTask | null;
  clearCompleted: () => void;
};

const ComicImageTaskQueueContext = createContext<ComicImageTaskQueueContextValue | null>(null);

function formatPageLabel(pageNumber: number) {
  return `Page ${String(pageNumber).padStart(2, "0")}`;
}

function createTaskId(episodeId: string, pageNumber: number) {
  return `${episodeId}-${pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

      void fetch("/api/admin/comic/page-image-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          episodeId: task.episodeId,
          pageNumber: task.pageNumber
        })
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
                        : "The image generation request could not be completed."
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
          task.episodeId === input.episodeId &&
          task.pageNumber === input.pageNumber &&
          (task.status === "queued" || task.status === "running")
      );

      if (activeTask) {
        return activeTask.id;
      }

      const id = createTaskId(input.episodeId, input.pageNumber);
      const label = input.label || formatPageLabel(input.pageNumber);

      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id,
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
      getLatestPageTask,
      clearCompleted
    }),
    [maxConcurrent, tasks, enqueue, getLatestPageTask, clearCompleted]
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
      .filter((candidate) => candidate.episodeId === episodeId && candidate.pageNumber === pageNumber)
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
