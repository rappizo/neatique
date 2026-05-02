import { prisma } from "@/lib/db";

const COMIC_LOCK_HISTORY_LIMIT = 5;

type LockSnapshotBase = {
  id: string;
  createdAt: string;
  note: string | null;
};

export type ComicCharacterLockSnapshot = LockSnapshotBase & {
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceNotes: string | null;
};

export type ComicSceneLockSnapshot = LockSnapshotBase & {
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceNotes: string | null;
};

type CharacterLockSource = {
  role: string;
  appearance: string;
  personality: string;
  speechGuide: string;
  referenceNotes: string | null;
};

type SceneLockSource = {
  summary: string;
  visualNotes: string;
  moodNotes: string;
  referenceNotes: string | null;
};

function getCharacterHistoryKey(characterId: string) {
  return `comic.character.lockHistory.${characterId}`;
}

function getSceneHistoryKey(sceneId: string) {
  return `comic.scene.lockHistory.${sceneId}`;
}

function createSnapshotId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNote(note?: string | null) {
  return typeof note === "string" && note.trim() ? note.trim() : null;
}

function parseHistoryValue<T>(value: string | null | undefined, isValid: (item: any) => item is T) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isValid).slice(0, COMIC_LOCK_HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function isCharacterLockSnapshot(item: any): item is ComicCharacterLockSnapshot {
  return (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.role === "string" &&
    typeof item.appearance === "string" &&
    typeof item.personality === "string" &&
    typeof item.speechGuide === "string" &&
    (typeof item.referenceNotes === "string" || item.referenceNotes === null) &&
    (typeof item.note === "string" || item.note === null)
  );
}

function isSceneLockSnapshot(item: any): item is ComicSceneLockSnapshot {
  return (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.summary === "string" &&
    typeof item.visualNotes === "string" &&
    typeof item.moodNotes === "string" &&
    (typeof item.referenceNotes === "string" || item.referenceNotes === null) &&
    (typeof item.note === "string" || item.note === null)
  );
}

async function readHistory<T>(key: string, isValid: (item: any) => item is T) {
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { key },
      select: { value: true }
    });

    return parseHistoryValue(setting?.value, isValid);
  } catch {
    return [];
  }
}

async function writeHistory<T>(key: string, history: T[]) {
  await prisma.storeSetting.upsert({
    where: { key },
    create: {
      key,
      value: JSON.stringify(history.slice(0, COMIC_LOCK_HISTORY_LIMIT))
    },
    update: {
      value: JSON.stringify(history.slice(0, COMIC_LOCK_HISTORY_LIMIT))
    }
  });
}

export async function getComicCharacterLockHistory(characterId: string) {
  return readHistory(getCharacterHistoryKey(characterId), isCharacterLockSnapshot);
}

export async function getComicSceneLockHistory(sceneId: string) {
  return readHistory(getSceneHistoryKey(sceneId), isSceneLockSnapshot);
}

export async function pushComicCharacterLockSnapshot(
  characterId: string,
  source: CharacterLockSource,
  note?: string | null
) {
  const snapshot: ComicCharacterLockSnapshot = {
    id: createSnapshotId(),
    createdAt: new Date().toISOString(),
    note: normalizeNote(note),
    role: source.role,
    appearance: source.appearance,
    personality: source.personality,
    speechGuide: source.speechGuide,
    referenceNotes: source.referenceNotes ?? null
  };
  const key = getCharacterHistoryKey(characterId);
  const history = await getComicCharacterLockHistory(characterId);
  await writeHistory(key, [snapshot, ...history]);
}

export async function pushComicSceneLockSnapshot(
  sceneId: string,
  source: SceneLockSource,
  note?: string | null
) {
  const snapshot: ComicSceneLockSnapshot = {
    id: createSnapshotId(),
    createdAt: new Date().toISOString(),
    note: normalizeNote(note),
    summary: source.summary,
    visualNotes: source.visualNotes,
    moodNotes: source.moodNotes,
    referenceNotes: source.referenceNotes ?? null
  };
  const key = getSceneHistoryKey(sceneId);
  const history = await getComicSceneLockHistory(sceneId);
  await writeHistory(key, [snapshot, ...history]);
}
