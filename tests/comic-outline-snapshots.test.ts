import assert from "node:assert/strict";
import test from "node:test";
import { createComicGeneratedOutlineSnapshot } from "../lib/comic-outline-snapshots";

test("comic outline snapshots keep generated bilingual text and revision notes", () => {
  const snapshot = createComicGeneratedOutlineSnapshot({
    taskType: "chapter-generate",
    level: "CHAPTER",
    id: "chapter-1",
    title: "Orientation Week Is a Scam",
    numberLabel: "Chapter 1",
    revisionNotes: "Use the day and night investigation version.",
    generatedAt: "2026-05-12T00:00:00.000Z",
    storedSummary: "## Chinese\n\nUpdated summary\n\n## English\n\nNew summary",
    storedOutline: "## Chinese\n\nUpdated outline\n\n## English\n\nNew outline",
    result: {
      title: "Orientation Week Is a Scam",
      summary: "Updated summary",
      summaryEn: "New summary",
      outline: "Updated outline",
      outlineEn: "New outline"
    }
  });

  assert.equal(snapshot.level, "CHAPTER");
  assert.equal(snapshot.numberLabel, "Chapter 1");
  assert.equal(snapshot.revisionNotes, "Use the day and night investigation version.");
  assert.equal(snapshot.outline, "Updated outline");
  assert.equal(snapshot.outlineEn, "New outline");
  assert.match(snapshot.storedOutline, /New outline/);
});
