import * as XLSX from "xlsx";
import type { ReviewReferenceExample } from "@/lib/openai-reviews";

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += character;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some(Boolean));
}

function parseMaybeNumber(value: string | undefined) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : null;
}

function getColumnIndex(headerMap: Map<string, number>, candidates: string[]) {
  for (const key of candidates) {
    const index = headerMap.get(key);
    if (typeof index === "number") {
      return index;
    }
  }

  return undefined;
}

function rowsToReferences(rows: string[][]) {
  if (rows.length < 2) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = new Map(headerRow.map((cell, index) => [normalizeHeader(cell), index]));
  const titleIndex = getColumnIndex(headerMap, ["reviewtitle", "title", "subject"]);
  const contentIndex = getColumnIndex(headerMap, ["reviewbody", "content", "review", "body", "reviewtext"]);
  const ratingIndex = getColumnIndex(headerMap, ["reviewrating", "rating", "score", "stars"]);
  const displayNameIndex = getColumnIndex(headerMap, [
    "reviewusername",
    "reviewername",
    "displayname",
    "name",
    "reviewer",
    "username"
  ]);

  if (titleIndex === undefined || contentIndex === undefined) {
    return [];
  }

  return dataRows
    .map<ReviewReferenceExample | null>((row) => {
      const title = row[titleIndex]?.trim() || "";
      const content = row[contentIndex]?.trim() || "";
      const displayName = displayNameIndex !== undefined ? row[displayNameIndex]?.trim() || "" : "";
      const rating = ratingIndex !== undefined ? parseMaybeNumber(row[ratingIndex]) : null;

      if (!title || !content) {
        return null;
      }

      return {
        displayName: displayName || "Anonymous",
        rating,
        title,
        content
      };
    })
    .filter((row): row is ReviewReferenceExample => Boolean(row));
}

export async function parseReviewReferenceFile(file: FormDataEntryValue | null) {
  if (!file || typeof file === "string") {
    return [];
  }

  if (!("arrayBuffer" in file) || typeof file.arrayBuffer !== "function") {
    return [];
  }

  const fileName = typeof file.name === "string" ? file.name.toLowerCase() : "";

  if (fileName.endsWith(".csv")) {
    const text = "text" in file && typeof file.text === "function" ? await file.text() : "";
    return rowsToReferences(parseCsv(text)).slice(0, 40);
  }

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return [];
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
      defval: ""
    });

    return rowsToReferences(rows).slice(0, 40);
  }

  return [];
}
