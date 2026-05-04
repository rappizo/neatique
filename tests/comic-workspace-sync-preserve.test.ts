import assert from "node:assert/strict";
import test from "node:test";
import { selectComicWorkspaceTextForSync } from "../lib/comic-workspace-sync-preserve";

test("workspace sync preserves existing bilingual text when workspace file is legacy English", () => {
  const selected = selectComicWorkspaceTextForSync({
    existingText: "## 中文\n\n新版中文大纲\n\n## English\n\nUpdated English outline",
    workspaceText: "# Chapter 1\n\nOld English outline",
    fallbackText: "Add the chapter outline here."
  });

  assert.match(selected, /新版中文大纲/);
  assert.doesNotMatch(selected, /Old English outline/);
});

test("workspace sync accepts a newer bilingual workspace file", () => {
  const selected = selectComicWorkspaceTextForSync({
    existingText: "# Chapter 1\n\nOld English outline",
    workspaceText: "# Chapter 1\n\n## 中文\n\n新版中文大纲\n\n## English\n\nUpdated English outline",
    fallbackText: "Add the chapter outline here."
  });

  assert.match(selected, /新版中文大纲/);
});

test("workspace sync keeps usable existing text when workspace only has a placeholder", () => {
  const selected = selectComicWorkspaceTextForSync({
    existingText: "Existing generated outline",
    workspaceText: "Add the episode outline here.",
    fallbackText: "Add the episode outline here."
  });

  assert.equal(selected, "Existing generated outline");
});
