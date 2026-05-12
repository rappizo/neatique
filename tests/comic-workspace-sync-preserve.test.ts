import assert from "node:assert/strict";
import test from "node:test";
import {
  selectComicWorkspaceTextForSync,
  selectComicWorkspaceTextForSyncResult
} from "../lib/comic-workspace-sync-preserve";

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

test("workspace sync preserves a newer generated database outline over an older workspace outline", () => {
  const selected = selectComicWorkspaceTextForSyncResult({
    existingText: "## 中文\n\n新版 Chapter 1 大纲\n\n## English\n\nNew Chapter 1 outline",
    workspaceText: "## 中文\n\n旧版 Chapter 1 大纲\n\n## English\n\nOld Chapter 1 outline",
    fallbackText: "Add the chapter outline here.",
    existingUpdatedAt: new Date("2026-05-12T08:00:00.000Z"),
    workspaceUpdatedAt: new Date("2026-05-12T07:00:00.000Z")
  });

  assert.equal(selected.source, "existing");
  assert.match(selected.text, /新版 Chapter 1 大纲/);
  assert.doesNotMatch(selected.text, /旧版 Chapter 1 大纲/);
});

test("workspace sync accepts a newer workspace outline when it was edited after the database", () => {
  const selected = selectComicWorkspaceTextForSyncResult({
    existingText: "## 中文\n\n数据库旧稿\n\n## English\n\nOld database outline",
    workspaceText: "## 中文\n\nworkspace 新稿\n\n## English\n\nUpdated workspace outline",
    fallbackText: "Add the chapter outline here.",
    existingUpdatedAt: new Date("2026-05-12T07:00:00.000Z"),
    workspaceUpdatedAt: new Date("2026-05-12T08:00:00.000Z")
  });

  assert.equal(selected.source, "workspace");
  assert.match(selected.text, /workspace 新稿/);
});
