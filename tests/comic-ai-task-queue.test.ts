import assert from "node:assert/strict";
import test from "node:test";
import {
  getComicAiTaskRetryDelayMs,
  isRetryableComicAiTaskError
} from "../lib/comic-ai-task-queue";

test("comic AI task retry detects Chinese upstream capacity errors", () => {
  const errorMessage =
    "当前分组上游负载已饱和，请稍后再试 (request id: 2026050817412638903544236861555)";

  assert.equal(isRetryableComicAiTaskError(errorMessage), true);
  assert.ok(
    getComicAiTaskRetryDelayMs(errorMessage, 1) >= 45_000,
    "Expected upstream capacity errors to get a cool-down before retry."
  );
});

test("comic AI task retry keeps non-transient validation errors final", () => {
  const errorMessage = "Generate a page-by-page prompt package before creating page images.";

  assert.equal(isRetryableComicAiTaskError(errorMessage), false);
  assert.equal(getComicAiTaskRetryDelayMs(errorMessage, 1), 0);
});
