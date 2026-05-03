import assert from "node:assert/strict";
import test from "node:test";
import {
  formatComicBilingualOutline,
  formatComicBilingualSummary,
  parseComicBilingualText
} from "../lib/comic-bilingual-outline";

test("comic bilingual outline parser splits stored markdown sections", () => {
  const stored = formatComicBilingualOutline({
    zh: "## 本集承诺\n\nNia 找到第一条线索。",
    en: "## Episode Promise\n\nNia finds the first clue."
  });
  const parsed = parseComicBilingualText(stored);

  assert.match(parsed.zh, /Nia 找到第一条线索/);
  assert.match(parsed.en, /Nia finds the first clue/);
});

test("comic bilingual summary parser handles inline language labels", () => {
  const stored = formatComicBilingualSummary({
    zh: "Nia 发现规则漏洞。",
    en: "Nia discovers a loophole in the rules."
  });
  const parsed = parseComicBilingualText(stored);

  assert.equal(parsed.zh, "Nia 发现规则漏洞。");
  assert.equal(parsed.en, "Nia discovers a loophole in the rules.");
});

test("comic bilingual parser keeps legacy single-language outlines usable", () => {
  assert.equal(parseComicBilingualText("Nia finds the first clue.").en, "Nia finds the first clue.");
  assert.equal(parseComicBilingualText("Nia 找到第一条线索。").zh, "Nia 找到第一条线索。");
});
