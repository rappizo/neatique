import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProductContentFlow,
  PRODUCT_CONTENT_SECTION_ORDER,
  type ProductContentSection
} from "@/components/product/product-content-flow";
import { fallbackProducts } from "@/lib/fallback-data";
import { getProductStory } from "@/lib/product-content";

const expectedProductContentOrder = [
  "visual-story",
  "product-details",
  "routine",
  "faq",
  "collection-exploration",
  "transparency",
  "reviews",
  "discovery-intro",
  "related-products",
  "related-guides"
] as const;

test("all current and future product pages use the approved content order", () => {
  assert.deepEqual(PRODUCT_CONTENT_SECTION_ORDER, expectedProductContentOrder);

  const slots = Object.fromEntries(
    PRODUCT_CONTENT_SECTION_ORDER.map((section) => [section, section])
  ) as Record<ProductContentSection, ReactNode>;
  const markup = renderToStaticMarkup(createElement(ProductContentFlow, { slots }));
  const positions = PRODUCT_CONTENT_SECTION_ORDER.map((section) =>
    markup.indexOf(`data-product-section="${section}"`)
  );

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
});

test("new catalog products must provide visual and written story content", () => {
  const customVisualSlugs = new Set(["pdrn-cream", "pdrn-serum"]);

  for (const product of fallbackProducts) {
    const story = getProductStory(product.slug);

    assert.ok(story.sections.length > 0, `${product.slug} is missing Product Details content`);
    if (!customVisualSlugs.has(product.slug)) {
      assert.ok(
        (story.detailImages || []).length > 0,
        `${product.slug} is missing its image-led story sections`
      );
    }
  }
});
