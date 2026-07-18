import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "@/app/sitemap";
import { getArticleEnhancements } from "@/lib/article-enhancements";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbs";
import { COLLECTIONS, getCollectionsForProduct } from "@/lib/collections";
import { canPublishPost } from "@/lib/editorial-compliance";
import { fallbackProducts } from "@/lib/fallback-data";
import { resolveSeoRoute } from "@/lib/seo-routing";

test("P2 exposes four distinct intent-led collections", () => {
  assert.equal(COLLECTIONS.length, 4);
  assert.equal(new Set(COLLECTIONS.map((collection) => collection.slug)).size, 4);
  assert.equal(new Set(COLLECTIONS.map((collection) => collection.description)).size, 4);
  assert.ok(COLLECTIONS.every((collection) => collection.introduction.join(" ").length > 250));
  assert.ok(COLLECTIONS.every((collection) => collection.choosingGuide.length >= 3));
  assert.ok(COLLECTIONS.every((collection) => collection.routineSteps.length >= 3));
});

test("every collection product slug resolves to a catalog product", () => {
  const knownSlugs = new Set(fallbackProducts.map((product) => product.slug));
  const collectionSlugs = COLLECTIONS.flatMap((collection) => collection.productSlugs);

  assert.ok(collectionSlugs.every((slug) => knownSlugs.has(slug)));
  assert.ok(fallbackProducts.every((product) => getCollectionsForProduct(product.slug).length > 0));
});

test("breadcrumb schema keeps visible hierarchy positions and canonical URLs", () => {
  const schema = buildBreadcrumbSchema([
    { name: "Home", href: "/" },
    { name: "Collections", href: "/collections" },
    { name: "PDRN Skincare", href: "/collections/pdrn-skincare" }
  ]);

  assert.equal(schema.itemListElement.length, 3);
  assert.equal(schema.itemListElement[2].position, 3);
  assert.equal(
    schema.itemListElement[2].item,
    "https://www.neatiquebeauty.com/collections/pdrn-skincare"
  );
});

test("thin but unique legacy guides receive substantive page enhancements", () => {
  assert.ok(getArticleEnhancements("what-is-pdrn-skincare").length >= 2);
  assert.ok(getArticleEnhancements("serum-vs-cream-routine-order").length >= 2);
});

test("consolidated article URLs permanently resolve to the retained intent", () => {
  assert.deepEqual(
    resolveSeoRoute(
      new URL("https://www.neatiquebeauty.com/beauty-tips/pdrn-serum-lightweight-repair-serum-routine")
    ),
    {
      type: "redirect",
      destination:
        "https://www.neatiquebeauty.com/beauty-tips/pdrn-peptide-serum-guide-smooth-hydrated-skin"
    }
  );
  assert.deepEqual(
    resolveSeoRoute(
      new URL("https://www.neatiquebeauty.com/beauty-tips/snail-mucin-routine-for-dry-skin")
    ),
    {
      type: "redirect",
      destination: "https://www.neatiquebeauty.com/collections/snail-mucin-skincare"
    }
  );
});

test("AI-assisted posts require a traceable editorial review before publishing", () => {
  assert.equal(
    canPublishPost({
      aiGenerated: true,
      publishing: true,
      editorialReviewed: false,
      reviewerName: null,
      reviewedAt: null
    }),
    false
  );
  assert.equal(
    canPublishPost({
      aiGenerated: true,
      publishing: true,
      editorialReviewed: true,
      reviewerName: "Verified Reviewer",
      reviewedAt: new Date("2026-07-18T00:00:00.000Z")
    }),
    true
  );
});

test("all collection pages are included in the canonical sitemap", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map((entry) => entry.url));

  assert.ok(COLLECTIONS.every((collection) =>
    urls.has(`https://www.neatiquebeauty.com/collections/${collection.slug}`)
  ));
});
