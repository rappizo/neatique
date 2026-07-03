import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultReviewPersonas,
  formatReviewPersonaForPrompt
} from "../lib/review-personas";

test("default review persona pool contains 100 unique women profiles", () => {
  assert.equal(defaultReviewPersonas.length, 100);
  assert.equal(new Set(defaultReviewPersonas.map((persona) => persona.slug)).size, 100);
  assert.equal(new Set(defaultReviewPersonas.map((persona) => persona.fullName)).size, 100);

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
    reviewLength: "short" as const
  };
  const prompt = formatReviewPersonaForPrompt(persona, 0);

  assert.match(prompt, /personaSlug:/);
  assert.match(prompt, new RegExp(persona.fullName));
  assert.match(prompt, /Writing habit:/);
  assert.match(prompt, /Product preference:/);
  assert.match(prompt, /Life stage:/);
  assert.match(prompt, /Review length target: Short review:/);
});
