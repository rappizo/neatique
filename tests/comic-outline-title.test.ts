import assert from "node:assert/strict";
import test from "node:test";
import {
  extractEpisodeTitleFromChapterOutline,
  normalizeGeneratedOutlineTitle,
  resolveGeneratedEpisodeTitle
} from "../lib/comic-outline-title";

test("generated episode titles drop the numeric prefix before saving to the sidebar title", () => {
  assert.equal(
    normalizeGeneratedOutlineTitle({
      generatedTitle: "Episode 9 - The Handbook Goes Through the Wall",
      fallbackTitle: "Night Tour, Wrong Turn",
      numberLabel: "Episode 9"
    }),
    "The Handbook Goes Through the Wall"
  );
});

test("generated episode titles can replace old working labels", () => {
  assert.equal(
    normalizeGeneratedOutlineTitle({
      generatedTitle: "The Fragment Behind the Wall",
      fallbackTitle: "The Name on the Page",
      numberLabel: "Episode 10"
    }),
    "The Fragment Behind the Wall"
  );
});

test("blank generated episode titles keep the existing title", () => {
  assert.equal(
    normalizeGeneratedOutlineTitle({
      generatedTitle: " ",
      fallbackTitle: "The Student Store Problem",
      numberLabel: "Episode 8"
    }),
    "The Student Store Problem"
  );
});

test("chapter outline episode title can be extracted as the parent title", () => {
  assert.equal(
    extractEpisodeTitleFromChapterOutline({
      episodeNumber: 8,
      chapterOutline: [
        "- Episode 07 - The Store List Does Not Match: first beat.",
        "- Episode 08 - The Day Route Disagree: daytime route check.",
        "- Episode 09 - The Handbook Goes Through the Wall: night beat."
      ].join("\n")
    }),
    "The Day Route Disagree"
  );
});

test("chapter outline episode title can be extracted from markdown headings", () => {
  assert.equal(
    extractEpisodeTitleFromChapterOutline({
      episodeNumber: 8,
      chapterOutline: [
        "### Episode 07 - The Student Store Problem",
        "### Episode 08 - The Day Route Disagrees",
        "### Episode 09 - The Handbook Goes Through the Wall"
      ].join("\n")
    }),
    "The Day Route Disagrees"
  );
});

test("parent chapter title wins when the model repeats the old episode title", () => {
  assert.equal(
    resolveGeneratedEpisodeTitle({
      generatedTitle: "The Student Store Problem",
      parentOutlineTitle: "The Day Route Disagree",
      fallbackTitle: "The Student Store Problem",
      numberLabel: "Episode 8"
    }),
    "The Day Route Disagree"
  );
});

test("fresh model title wins when it is not just the old fallback title", () => {
  assert.equal(
    resolveGeneratedEpisodeTitle({
      generatedTitle: "The Store Contradiction",
      parentOutlineTitle: "The Day Route Disagree",
      fallbackTitle: "The Student Store Problem",
      numberLabel: "Episode 8"
    }),
    "The Store Contradiction"
  );
});
