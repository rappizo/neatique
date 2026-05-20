"use client";

import { useState, type FormEvent } from "react";
import { useComicImageTaskQueue } from "@/components/admin/comic-image-task-queue";

type ComicExtraStoryOutlineRevisionFormProps = {
  episodeId: string;
  episodeTitle: string;
  disabled?: boolean;
};

function getTaskSortTime(task: { completedAt?: number; createdAt: number }) {
  return task.completedAt || task.createdAt;
}

export function ComicExtraStoryOutlineRevisionForm({
  episodeId,
  episodeTitle,
  disabled = false
}: ComicExtraStoryOutlineRevisionFormProps) {
  const { enqueueOutlineTask, tasks } = useComicImageTaskQueue();
  const [revisionNotes, setRevisionNotes] = useState("");
  const [notice, setNotice] = useState("");
  const trimmedNotes = revisionNotes.trim();
  const task =
    [...tasks]
      .filter(
        (candidate) =>
          candidate.kind === "outline" &&
          candidate.outlineTaskType === "extra-story-generate" &&
          candidate.targetId === episodeId
      )
      .sort((left, right) => getTaskSortTime(right) - getTaskSortTime(left))[0] || null;
  const isActive = task?.status === "queued" || task?.status === "running";
  const label =
    task?.status === "queued"
      ? "Revision queued..."
      : task?.status === "running"
        ? "Revising with AI..."
        : task?.status === "failed"
          ? "Retry AI revision"
          : "Revise outline with AI";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedNotes) {
      setNotice("Write revision notes first.");
      return;
    }

    enqueueOutlineTask({
      taskType: "extra-story-generate",
      targetId: episodeId,
      revisionNotes: trimmedNotes,
      label: `Revise extra-story outline: ${episodeTitle}`
    });
    setRevisionNotes("");
    setNotice("Revision added to Comic tasks.");
  }

  return (
    <form className="admin-comic-outline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={`extra-story-revision-${episodeId}`}>AI revision notes</label>
        <textarea
          id={`extra-story-revision-${episodeId}`}
          name="revisionNotes"
          rows={5}
          placeholder="例如：更突出 SE96 的日常使用方法、肤感、适合人群和主要功能；剧情可以更像软性宣传，但不要像硬广。"
          value={revisionNotes}
          onChange={(event) => {
            setRevisionNotes(event.target.value);
            if (notice) {
              setNotice("");
            }
          }}
        />
      </div>
      <div className="admin-comic-form-actions">
        <button
          type="submit"
          className="button button--secondary"
          disabled={disabled || isActive || !trimmedNotes}
          aria-busy={task?.status === "running"}
        >
          {label}
        </button>
        {notice ? <span className="form-note">{notice}</span> : null}
        {task?.status === "failed" && task.errorMessage ? (
          <span className="form-note">{task.errorMessage}</span>
        ) : null}
      </div>
    </form>
  );
}
