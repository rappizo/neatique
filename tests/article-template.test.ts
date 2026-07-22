import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  extractArticleFaqs,
  extractArticleImages,
  parseArticleContent,
  slugifyArticleHeading
} from "@/lib/article-format";
import {
  pdrnCleanserWithoutTightnessPost,
  pdrnSerumCreamWithoutPillingPost
} from "@/lib/editorial-posts";
import { getCollectionsForPost } from "@/lib/collections";

test("article markup supports SEO image figures and stable heading anchors", () => {
  const content = [
    "## Gentle cleansing method",
    "",
    "A useful paragraph.",
    "",
    "![Soft cleansing foam on fingertips](/posts/example.webp \"Use a small amount of foam.\")"
  ].join("\n");
  const blocks = parseArticleContent(content);
  const images = extractArticleImages(content);

  assert.equal(blocks.some((block) => block.type === "image"), true);
  assert.deepEqual(images, [{
    src: "/posts/example.webp",
    alt: "Soft cleansing foam on fingertips",
    caption: "Use a small amount of foam."
  }]);
  assert.equal(slugifyArticleHeading("Gentle cleansing method"), "gentle-cleansing-method");
});

test("article markup extracts visible FAQ questions for structured data", () => {
  const faqs = extractArticleFaqs([
    "## Frequently asked questions",
    "",
    "### Does serum go before cream?",
    "",
    "Use [serum first](/beauty-tips/serum-vs-cream-routine-order), then cream.",
    "",
    "### Can I use cream alone?",
    "",
    "Yes. Keep the routine as simple as needed."
  ].join("\n"));

  assert.deepEqual(faqs, [
    {
      question: "Does serum go before cream?",
      answer: "Use serum first, then cream."
    },
    {
      question: "Can I use cream alone?",
      answer: "Yes. Keep the routine as simple as needed."
    }
  ]);
});

test("the first three-month-plan article follows the editorial and image standard", () => {
  const post = pdrnCleanserWithoutTightnessPost;
  const blocks = parseArticleContent(post.content);
  const headings = blocks.filter((block) => block.type === "h2");
  const images = extractArticleImages(post.content);

  assert.equal(post.published, true);
  assert.equal(post.aiGenerated, true);
  assert.equal(post.editorialReviewed, true);
  assert.equal(post.reviewerName, "Simon Wagner");
  assert.ok(post.reviewedAt instanceof Date);
  assert.ok(post.publishedAt instanceof Date);
  assert.ok(headings.length >= 7);
  assert.equal(images.length, 3);
  assert.ok(post.seoTitle.length <= 50);
  assert.ok(post.seoDescription.length >= 140 && post.seoDescription.length <= 160);
  assert.ok(post.excerpt.length >= 140 && post.excerpt.length <= 180);
  assert.ok(getCollectionsForPost(post.slug).some((collection) => collection.slug === "pdrn-skincare"));
  assert.ok(post.content.includes("/shop/pdrn-cleanser"));
  assert.ok(post.content.includes("/collections/pdrn-skincare"));
  assert.ok(post.externalLinks.every((link) => link.url.startsWith("https://www.aad.org/")));

  const allImages = [{
    src: post.coverImageUrl,
    alt: post.coverImageAlt || "",
    caption: "The article cover introduces the product and cleansing context."
  }, ...images];

  for (const image of allImages) {
    const imagePath = path.join(process.cwd(), "public", image.src.replace(/^\//, ""));
    assert.equal(existsSync(imagePath), true, image.src);
    assert.ok(statSync(imagePath).size < 220_000, image.src);
    assert.ok(image.alt.length >= 40 && image.alt.length <= 140, image.alt);
    assert.ok((image.caption || "").length >= 35, image.src);
    assert.match(image.src, /[a-z0-9-]+\.webp$/);
  }
});

test("the second three-month-plan article is reviewed and ready for public release", () => {
  const post = pdrnSerumCreamWithoutPillingPost;
  const blocks = parseArticleContent(post.content);
  const headings = blocks.filter((block) => block.type === "h2");
  const images = extractArticleImages(post.content);
  const faqs = extractArticleFaqs(post.content);

  assert.equal(post.published, true);
  assert.equal(post.aiGenerated, true);
  assert.equal(post.authorName, "Tracy Chen");
  assert.equal(post.authorType, "Person");
  assert.equal(post.editorialReviewed, true);
  assert.equal(post.reviewerName, "Tracy Chen");
  assert.ok(post.reviewedAt instanceof Date);
  assert.ok(post.publishedAt instanceof Date);
  assert.ok(headings.length >= 8);
  assert.equal(images.length, 3);
  assert.equal(faqs.length, 5);
  assert.ok(post.seoTitle.length <= 50);
  assert.ok(post.seoDescription.length >= 140 && post.seoDescription.length <= 160);
  assert.ok(post.excerpt.length >= 140 && post.excerpt.length <= 180);
  assert.ok(getCollectionsForPost(post.slug).some((collection) => collection.slug === "pdrn-skincare"));
  assert.ok(post.content.includes("/shop/pdrn-serum"));
  assert.ok(post.content.includes("/shop/pdrn-cream"));
  assert.ok(post.content.includes("/collections/pdrn-skincare"));
  assert.ok(post.externalLinks.every((link) => {
    const hostname = new URL(link.url).hostname;
    return hostname === "www.aad.org" || hostname === "www.fda.gov";
  }));

  const allImages = [{
    src: post.coverImageUrl,
    alt: post.coverImageAlt || "",
    caption: "The lightweight serum and richer cream form a clear two-step leave-on sequence."
  }, ...images];

  for (const image of allImages) {
    const imagePath = path.join(process.cwd(), "public", image.src.replace(/^\//, ""));
    assert.equal(existsSync(imagePath), true, image.src);
    assert.ok(statSync(imagePath).size < 220_000, image.src);
    assert.ok(image.alt.length >= 40 && image.alt.length <= 140, image.alt);
    assert.ok((image.caption || "").length >= 35, image.src);
    assert.match(image.src, /[a-z0-9-]+\.webp$/);
  }
});
