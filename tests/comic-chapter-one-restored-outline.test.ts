import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const chapterRoot = path.join(
  process.cwd(),
  "comic",
  "seasons",
  "season-01",
  "chapter-01-orientation-week-is-a-scam"
);

function readOutline(relativePath: string) {
  return readFileSync(path.join(chapterRoot, relativePath), "utf8");
}

test("chapter one outline keeps the restored day and night investigation structure", () => {
  const outline = readOutline("chapter-outline.md");

  assert.match(outline, /The Store List Does Not Match/);
  assert.match(outline, /The Day Map Says Otherwise/);
  assert.match(outline, /The Handbook Goes Through the Wall/);
  assert.match(outline, /The Fragment Behind the Wall/);
  assert.match(outline, /Muci, Nia, and Padarana/);
  assert.match(outline, /Old Version handbook/);
  assert.match(outline, /Scratched Ring Mark\.jpg/);

  assert.doesNotMatch(outline, /Night Tour, Wrong Turn/);
  assert.doesNotMatch(outline, /The Student Store Problem/);
  assert.doesNotMatch(outline, /The Name on the Page/);
});

test("chapter one late episode outlines keep only the restored active trio", () => {
  const lateEpisodeOutlines = [
    "episode-07-the-stamp-hunt-that-got-weird/episode-outline.md",
    "episode-08-the-student-store-problem/episode-outline.md",
    "episode-09-night-tour-wrong-turn/episode-outline.md",
    "episode-10-the-name-on-the-page/episode-outline.md"
  ];

  for (const relativePath of lateEpisodeOutlines) {
    const outline = readOutline(relativePath);
    assert.match(outline, /### Main Characters\s+- Muci\s+- Nia\s+- Padarana/);
    assert.doesNotMatch(outline, /- Padaruna\b/);
    assert.doesNotMatch(outline, /- Snacri\b/);
    assert.doesNotMatch(outline, /- Artrans\b/);
  }
});

test("chapter one wall and fragment beats remain available for future generation", () => {
  const episodeNine = readOutline("episode-09-night-tour-wrong-turn/episode-outline.md");
  const episodeTen = readOutline("episode-10-the-name-on-the-page/episode-outline.md");

  assert.match(episodeNine, /handbook glowing, lifting from Muci, and passing through the wall/);
  assert.match(episodeNine, /Observation Archive/);
  assert.match(episodeTen, /There is no universal glow/);
  assert.match(episodeTen, /The Glow Thesis fragment/);
  assert.match(episodeTen, /Scratched Ring Mark\.jpg/);
});
