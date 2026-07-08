import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultReviewPersonas,
  formatReviewPersonaForPrompt
} from "../lib/review-personas";

test("default review persona pool contains 500 unique women profiles", () => {
  assert.equal(defaultReviewPersonas.length, 500);
  assert.equal(new Set(defaultReviewPersonas.map((persona) => persona.slug)).size, 500);
  assert.equal(new Set(defaultReviewPersonas.map((persona) => persona.fullName)).size, 500);

  for (const persona of defaultReviewPersonas) {
    assert.ok(persona.age >= 18);
    assert.ok(persona.fullName.includes(" "));
    assert.ok(persona.tags.length >= 8);
    assert.ok(persona.lifeImagePrompt.includes(persona.fullName));
    assert.ok(persona.writingStyle);
    assert.ok(persona.productPreference);
  }
});

test("review persona prompt includes voice, buyer, and lifestyle segmentation", () => {
  const persona = {
    id: "persona-1",
    ...defaultReviewPersonas[0],
    reviewLength: "short" as const,
    reviewAngle: "two-week routine update",
    reviewStructure: "open with why she bought it, add one routine moment, then give a measured verdict",
    reviewDetailFocus: "absorption speed",
    reviewPhrasingGuide: "keep one sentence very short"
  };
  const prompt = formatReviewPersonaForPrompt(persona, 0);

  assert.match(prompt, /personaSlug:/);
  assert.match(prompt, new RegExp(persona.fullName));
  assert.match(prompt, /Writing habit:/);
  assert.match(prompt, /Product preference:/);
  assert.match(prompt, /Life stage:/);
  assert.match(prompt, /Review length target: Short review:/);
  assert.match(prompt, /Review angle: two-week routine update/);
  assert.match(prompt, /Review structure:/);
  assert.match(prompt, /Detail focus: absorption speed/);
  assert.match(prompt, /Phrasing guide: keep one sentence very short/);
});
