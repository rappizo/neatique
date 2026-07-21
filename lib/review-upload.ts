export const ADMIN_UPLOADED_REVIEW_SOURCE = "ADMIN_UPLOAD";
export const ADMIN_UPLOADED_REVIEW_TITLE = "Customer review";
export const ADMIN_UPLOADED_REVIEW_INTERNAL_RATING = 5;
export const ADMIN_REVIEW_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ADMIN_REVIEW_UPLOAD_MAX_ROWS = 5000;
export const ADMIN_REVIEW_UPLOAD_TEMPLATE_COLUMNS = [
  "sku",
  "username",
  "purchaseChannel",
  "reviewContent",
  "reviewImageUrl",
  "reviewDate"
] as const;

export type AdminReviewUploadRow = {
  rowNumber: number;
  sku: string;
  displayName: string;
  purchaseChannel: string;
  content: string;
  reviewImageUrl: string | null;
  reviewDate: Date;
};

export type AdminReviewUploadParseResult =
  | { ok: true; rows: AdminReviewUploadRow[] }
  | {
      ok: false;
      code: "invalid-csv" | "invalid-columns" | "empty" | "too-many-rows" | "invalid-row";
      rowNumber?: number;
      field?: string;
    };

export type ReviewImageUrlResult =
  | { valid: true; value: string | null }
  | { valid: false; value: null };

export function normalizeReviewImageUrl(value: string | null | undefined): ReviewImageUrlResult {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return { valid: true, value: null };
  }

  if (normalized.length > 2048) {
    return { valid: false, value: null };
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, value: null };
    }

    return { valid: true, value: normalized };
  } catch {
    return { valid: false, value: null };
  }
}

function normalizeCsvHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    return null;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parseReviewDisplayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T12:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
}

export function buildAdminReviewUploadTemplate() {
  return `\uFEFF${ADMIN_REVIEW_UPLOAD_TEMPLATE_COLUMNS.join(",")}\r\n`;
}

export function parseAdminReviewUploadCsv(text: string): AdminReviewUploadParseResult {
  const parsedRows = parseCsvRows(text);

  if (!parsedRows || parsedRows.length === 0) {
    return { ok: false, code: "invalid-csv" };
  }

  const [headerRow, ...dataRows] = parsedRows;
  const headerMap = new Map(headerRow.map((cell, index) => [normalizeCsvHeader(cell), index]));
  const columns = {
    sku: headerMap.get("sku"),
    username: headerMap.get("username"),
    purchaseChannel: headerMap.get("purchasechannel"),
    reviewContent: headerMap.get("reviewcontent"),
    reviewImageUrl: headerMap.get("reviewimageurl"),
    reviewDate: headerMap.get("reviewdate")
  };

  const missingRequiredField = [
    ["sku", columns.sku],
    ["username", columns.username],
    ["purchaseChannel", columns.purchaseChannel],
    ["reviewContent", columns.reviewContent],
    ["reviewDate", columns.reviewDate]
  ].find(([, index]) => index === undefined);

  if (missingRequiredField) {
    return { ok: false, code: "invalid-columns", field: String(missingRequiredField[0]) };
  }

  if (dataRows.length === 0) {
    return { ok: false, code: "empty" };
  }

  if (dataRows.length > ADMIN_REVIEW_UPLOAD_MAX_ROWS) {
    return { ok: false, code: "too-many-rows" };
  }

  const rows: AdminReviewUploadRow[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    const rowNumber = index + 2;
    const sku = row[columns.sku!] ?? "";
    const displayName = row[columns.username!] ?? "";
    const purchaseChannel = row[columns.purchaseChannel!] ?? "";
    const content = row[columns.reviewContent!] ?? "";
    const rawReviewDate = row[columns.reviewDate!] ?? "";
    const reviewDate = parseReviewDisplayDate(rawReviewDate);
    const imageUrlResult = normalizeReviewImageUrl(
      columns.reviewImageUrl === undefined ? "" : row[columns.reviewImageUrl]
    );

    const invalidField =
      !sku || sku.length > 100
        ? "sku"
        : !displayName || displayName.length > 100
          ? "username"
          : !purchaseChannel || purchaseChannel.length > 120
            ? "purchaseChannel"
            : !content || content.length > 5000
              ? "reviewContent"
              : !imageUrlResult.valid
                ? "reviewImageUrl"
                : !reviewDate
                  ? "reviewDate"
                  : null;

    if (invalidField || !reviewDate || !imageUrlResult.valid) {
      return { ok: false, code: "invalid-row", rowNumber, field: invalidField ?? undefined };
    }

    rows.push({
      rowNumber,
      sku,
      displayName,
      purchaseChannel,
      content,
      reviewImageUrl: imageUrlResult.value,
      reviewDate
    });
  }

  return { ok: true, rows };
}

export function isAdminUploadedReview(source: string | null | undefined) {
  return source === ADMIN_UPLOADED_REVIEW_SOURCE;
}
