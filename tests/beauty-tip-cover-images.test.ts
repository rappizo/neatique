import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { samplePosts } from "@/lib/sample-store-data";

const beautyTipCoverImages: Record<string, string> = {
  "body-cream-for-dry-skin": "dry-skin-body-cream-neatique-bee-venom.webp",
  "brightening-cream-for-even-looking-glow": "brightening-cream-neatique-at13.webp",
  "how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine":
    "nad-peptide-serum-am-pm-routine.webp",
  "how-to-use-pdrn-cream-for-a-calm-hydrated-skin-routine":
    "pdrn-cream-hydrated-skin-routine.webp",
  "how-to-use-snail-mucin-serum-hydration-routine":
    "snail-mucin-serum-hydration-routine.webp",
  "how-to-use-tranexamic-serum-even-looking-complexion":
    "tranexamic-serum-even-looking-skin.webp",
  "niacinamide-tranexamic-serum-for-uneven-looking-tone":
    "niacinamide-tranexamic-serum-uneven-tone.webp",
  "pdrn-peptide-serum-guide-smooth-hydrated-skin":
    "pdrn-peptide-serum-hydration-guide.webp",
  "serum-vs-cream-routine-order": "serum-before-cream-neatique-routine.webp",
  "snail-mucin-cream-moisturizer-routine": "snail-mucin-cream-moisturizer-routine.webp",
  "snail-mucin-routine-for-dry-skin": "snail-mucin-routine-neatique-serum-cream.webp",
  "what-is-pdrn-skincare": "pdrn-skincare-guide-neatique-serum-cream.webp",
  "what-to-look-for-in-a-barrier-repair-cream-for-dry-dehydrated-skin":
    "barrier-repair-cream-dry-dehydrated-skin.webp"
};

test("every current Beauty Tips cover has an optimized local WebP asset", () => {
  assert.equal(Object.keys(beautyTipCoverImages).length, 13);

  for (const [slug, fileName] of Object.entries(beautyTipCoverImages)) {
    const absolutePath = path.join(process.cwd(), "public", "posts", fileName);
    assert.ok(existsSync(absolutePath), `${slug} is missing ${fileName}`);

    const file = readFileSync(absolutePath);
    assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF", `${fileName} is not WebP`);
    assert.equal(file.subarray(8, 12).toString("ascii"), "WEBP", `${fileName} is not WebP`);
    assert.ok(statSync(absolutePath).size < 200_000, `${fileName} is too large for a guide card`);
  }
});

test("fallback Beauty Tips use the refreshed covers and descriptive alt text", () => {
  for (const post of samplePosts) {
    assert.match(post.coverImageUrl, /^\/posts\/[a-z0-9-]+\.webp$/);
    assert.match(post.coverImageAlt || "", /Neatique/);
  }
});

test("the production migration updates every known guide cover", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "prisma",
      "migrations",
      "20260719110000_refresh_beauty_tip_cover_images",
      "migration.sql"
    ),
    "utf8"
  );

  for (const [slug, fileName] of Object.entries(beautyTipCoverImages)) {
    assert.match(migration, new RegExp(slug));
    assert.match(migration, new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("product pages reuse the homepage three-column post cards for related guides", () => {
  const pageSource = readFileSync(
    path.join(process.cwd(), "app", "(site)", "shop", "[slug]", "page.tsx"),
    "utf8"
  );

  assert.match(
    pageSource,
    /post-grid post-grid--home-featured product-related-guides-grid/
  );
  assert.match(pageSource, /<PostCard key=\{post\.id\} post=\{post\} \/>/);
});

test("Next Image allows optimized Beauty Tips assets from the posts directory", () => {
  const nextConfigSource = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

  assert.match(nextConfigSource, /pathname:\s*"\/posts\/\*\*"/);
});
