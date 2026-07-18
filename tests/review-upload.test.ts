import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_UPLOADED_REVIEW_SOURCE,
  isAdminUploadedReview,
  normalizeReviewImageUrl
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
