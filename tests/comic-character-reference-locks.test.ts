import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const CHARACTER_ROOT = join(process.cwd(), "comic", "characters");

test("comic character profile locks point at existing jpg model sheets", async () => {
  const entries = await readdir(CHARACTER_ROOT, { withFileTypes: true });
  const characterSlugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  assert.ok(characterSlugs.length > 0, "Expected comic character folders to exist.");

  for (const slug of characterSlugs) {
    const characterPath = join(CHARACTER_ROOT, slug);
    const profile = await readFile(join(characterPath, "profile.md"), "utf8");
    const refs = await readdir(join(characterPath, "refs"));

    assert.ok(
      refs.includes("model-sheet.jpg"),
      `${slug} must include refs/model-sheet.jpg.`
    );
    assert.match(
      profile,
      /refs\/model-sheet\.jpg/,
      `${slug} profile must name refs/model-sheet.jpg as the model-sheet lock.`
    );
    assert.doesNotMatch(
      profile,
      /refs\/model-sheet\.png|model-sheet\.png/,
      `${slug} profile must not point at the removed png model sheet.`
    );
  }
});
