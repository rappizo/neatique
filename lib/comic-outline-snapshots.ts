export type ComicOutlineSnapshotLevel = "PROJECT" | "SEASON" | "CHAPTER" | "EPISODE";

export type ComicGeneratedOutlineContent = {
  title?: string;
  summary: string;
  summaryEn: string;
  outline: string;
  outlineEn: string;
};

export type ComicGeneratedOutlineSnapshot = {
  taskType: string;
  level: ComicOutlineSnapshotLevel;
  id: string;
  title: string;
  generatedTitle?: string;
  numberLabel?: string;
  summary: string;
  summaryEn: string;
  outline: string;
  outlineEn: string;
  storedSummary: string;
  storedOutline: string;
  revisionNotes?: string;
  generatedAt: string;
};

export function createComicGeneratedOutlineSnapshot(input: {
  taskType: string;
  level: ComicOutlineSnapshotLevel;
  id: string;
  title: string;
  numberLabel?: string | null;
  result: ComicGeneratedOutlineContent;
  storedSummary: string;
  storedOutline: string;
  revisionNotes?: string | null;
  generatedAt?: string;
}): ComicGeneratedOutlineSnapshot {
  const generatedTitle = input.result.title?.trim();
  const revisionNotes = input.revisionNotes?.trim();
  const numberLabel = input.numberLabel?.trim();

  return {
    taskType: input.taskType,
    level: input.level,
    id: input.id,
    title: input.title,
    generatedTitle: generatedTitle || undefined,
    numberLabel: numberLabel || undefined,
    summary: input.result.summary,
    summaryEn: input.result.summaryEn,
    outline: input.result.outline,
    outlineEn: input.result.outlineEn,
    storedSummary: input.storedSummary,
    storedOutline: input.storedOutline,
    revisionNotes: revisionNotes || undefined,
    generatedAt: input.generatedAt || new Date().toISOString()
  };
}
