import { prisma } from "@/lib/db";

const COMIC_PROMPT_QA_NEGLECT_SETTING_KEY = "comic.promptQa.neglectedFindings";
const COMIC_PROMPT_QA_NEGLECT_LIMIT = 200;

export type ComicPromptQaNeglectRecord = {
  key: string;
  severity: string;
  message: string;
  createdAt: string;
};

function isNeglectRecord(value: any): value is ComicPromptQaNeglectRecord {
  return (
    value &&
    typeof value === "object" &&
    typeof value.key === "string" &&
    typeof value.severity === "string" &&
    typeof value.message === "string" &&
    typeof value.createdAt === "string"
  );
}

function parseNeglectRecords(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(isNeglectRecord).slice(0, COMIC_PROMPT_QA_NEGLECT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export async function getNeglectedComicPromptQaFindings() {
  const setting = await prisma.storeSetting.findUnique({
    where: { key: COMIC_PROMPT_QA_NEGLECT_SETTING_KEY },
    select: { value: true }
  });

  return parseNeglectRecords(setting?.value);
}

export async function getNeglectedComicPromptQaFindingKeys() {
  return getNeglectedComicPromptQaFindings().then((records) =>
    records.map((record) => record.key)
  );
}

export async function addNeglectedComicPromptQaFinding(input: {
  key: string;
  severity: string;
  message: string;
}) {
  const key = input.key.trim();

  if (!key) {
    return;
  }

  const previousRecords = await getNeglectedComicPromptQaFindings();
  const nextRecord: ComicPromptQaNeglectRecord = {
    key,
    severity: input.severity.trim() || "warning",
    message: input.message.trim() || key,
    createdAt: new Date().toISOString()
  };
  const nextRecords = [
    nextRecord,
    ...previousRecords.filter((record) => record.key !== key)
  ].slice(0, COMIC_PROMPT_QA_NEGLECT_LIMIT);

  await prisma.storeSetting.upsert({
    where: { key: COMIC_PROMPT_QA_NEGLECT_SETTING_KEY },
    create: {
      key: COMIC_PROMPT_QA_NEGLECT_SETTING_KEY,
      value: JSON.stringify(nextRecords)
    },
    update: {
      value: JSON.stringify(nextRecords)
    }
  });
}
