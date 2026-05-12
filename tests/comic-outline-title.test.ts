import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGeneratedOutlineTitle } from "../lib/comic-outline-title";

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
