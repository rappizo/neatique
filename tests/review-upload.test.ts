import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_REVIEW_UPLOAD_TEMPLATE_COLUMNS,
  ADMIN_UPLOADED_REVIEW_SOURCE,
  buildAdminReviewUploadTemplate,
  isAdminUploadedReview,
  normalizeReviewImageUrl,
  parseAdminReviewUploadCsv
} from "../lib/review-upload";

test("review image links accept http and https URLs", () => {
  assert.deepEqual(normalizeReviewImageUrl(" https://images.example.com/review.jpg "), {
    valid: true,
    value: "https://images.example.com/review.jpg"
  });
  assert.deepEqual(normalizeReviewImageUrl("http://images.example.com/review.jpg"), {
    valid: true,
    value: "http://images.example.com/review.jpg"
  });
});

test("review image links reject unsafe or malformed values", () => {
  assert.deepEqual(normalizeReviewImageUrl("javascript:alert(1)"), {
    valid: false,
    value: null
  });
  assert.deepEqual(normalizeReviewImageUrl("not a URL"), { valid: false, value: null });
  assert.deepEqual(normalizeReviewImageUrl(""), { valid: true, value: null });
});

test("admin uploaded reviews have a stable non-synthetic source", () => {
  assert.equal(isAdminUploadedReview(ADMIN_UPLOADED_REVIEW_SOURCE), true);
  assert.equal(isAdminUploadedReview("CUSTOMER"), false);
});

test("review upload template exposes the complete CSV header", () => {
  assert.equal(
    buildAdminReviewUploadTemplate(),
    `\uFEFF${ADMIN_REVIEW_UPLOAD_TEMPLATE_COLUMNS.join(",")}\r\n`
  );
});

test("review upload CSV parses multiple SKUs, quoted commas, and display dates", () => {
  const result = parseAdminReviewUploadCsv(
    [
      ADMIN_REVIEW_UPLOAD_TEMPLATE_COLUMNS.join(","),
      'P0001,Ava,Amazon,"Soft, comfortable texture",https://example.com/one.jpg,2026-07-01',
      'P0002,Mia,TikTok Shop,"First line\nSecond line",,2026-07-02'
    ].join("\r\n")
  );

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].content, "Soft, comfortable texture");
  assert.equal(result.rows[0].reviewDate.toISOString(), "2026-07-01T12:00:00.000Z");
  assert.equal(result.rows[1].content, "First line\nSecond line");
  assert.equal(result.rows[1].reviewImageUrl, null);
});

test("review upload CSV rejects invalid dates with the source row number", () => {
  const result = parseAdminReviewUploadCsv(
    [
      ADMIN_REVIEW_UPLOAD_TEMPLATE_COLUMNS.join(","),
      "P0001,Ava,Amazon,Useful review,,2026-02-30"
    ].join("\n")
  );

  assert.deepEqual(result, {
    ok: false,
    code: "invalid-row",
    rowNumber: 2,
    field: "reviewDate"
  });
});

test("review upload CSV requires the review date column", () => {
  const result = parseAdminReviewUploadCsv(
    "sku,username,purchaseChannel,reviewContent\nP0001,Ava,Amazon,Useful review"
  );

  assert.deepEqual(result, {
    ok: false,
    code: "invalid-columns",
    field: "reviewDate"
  });
});
