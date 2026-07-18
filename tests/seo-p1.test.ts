import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "@/app/sitemap";
import { toGoogleAnalyticsItem } from "@/lib/analytics";
import { fallbackProducts } from "@/lib/fallback-data";
import { buildGoogleMerchantFeed } from "@/lib/merchant-feed";
import { PRODUCT_SEO_BY_SLUG } from "@/lib/product-seo";
import { isValidGtin, normalizeGtin } from "@/lib/product-identifiers";
import {
  buildProductFaqs,
  buildProductRoutine,
  formatProductOrigin,
  selectRelatedProducts
} from "@/lib/product-transparency";
import { getCollectionsForProduct } from "@/lib/collections";

test("all 12 products have unique search titles and descriptions", () => {
  const entries = Object.values(PRODUCT_SEO_BY_SLUG);

  assert.equal(entries.length, 12);
  assert.equal(new Set(entries.map((entry) => entry.title)).size, 12);
  assert.equal(new Set(entries.map((entry) => entry.description)).size, 12);
  assert.ok(entries.every((entry) => `${entry.title} | Neatique`.length <= 60));
  assert.ok(entries.every((entry) => entry.description.length >= 100 && entry.description.length <= 165));
});

test("GTIN validation accepts valid check digits and rejects invented values", () => {
  assert.equal(isValidGtin("4006381333931"), true);
  assert.equal(isValidGtin("036000291452"), true);
  assert.equal(normalizeGtin("0 36000-29145 2"), "036000291452");
  assert.equal(isValidGtin("4006381333932"), false);
  assert.equal(isValidGtin("12345"), false);
  assert.equal(isValidGtin("0000000000000"), false);
});

test("GA4 item mapping uses stable product IDs and decimal prices", () => {
  const product = fallbackProducts[0];
  const item = toGoogleAnalyticsItem(product, 2, {
    item_list_id: "shop",
    item_list_name: "Shop"
  });

  assert.equal(item.item_id, product.productCode || product.id);
  assert.equal(item.price, product.priceCents / 100);
  assert.equal(item.quantity, 2);
  assert.equal(item.item_brand, "Neatique");
});

test("merchant feed escapes content and only publishes verified identifiers", () => {
  const product = {
    ...fallbackProducts[0],
    name: "Serum & Cream <Set>",
    gtin: "4006381333931",
    mpn: "SHOULD-NOT-OVERRIDE-SKU",
    identifierExists: true,
    netContent: "50 mL"
  };
  const xml = buildGoogleMerchantFeed([product]);

  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:gtin>4006381333931<\/g:gtin>/);
  assert.match(xml, new RegExp(`<g:mpn>${product.productCode}<\\/g:mpn>`));
  assert.doesNotMatch(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
  assert.match(xml, /<g:price>0\.00 USD<\/g:price>/);
});

test("merchant feed omits unknown IDs but can explicitly mark manufacturer identifiers absent", () => {
  const product = {
    ...fallbackProducts[0],
    productCode: "",
    gtin: "not-a-gtin",
    mpn: null,
    identifierExists: false
  };
  const xml = buildGoogleMerchantFeed([product]);

  assert.doesNotMatch(xml, /<g:gtin>/);
  assert.doesNotMatch(xml, /<g:mpn>/);
  assert.match(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
});

test("every fallback product keeps the confirmed manufacturer MPN and PRC origin", () => {
  const xml = buildGoogleMerchantFeed(fallbackProducts);

  for (const product of fallbackProducts) {
    assert.equal(product.mpn, product.productCode);
    assert.equal(product.identifierExists, true);
    assert.equal(product.countryOfOrigin, "CN");
    assert.match(xml, new RegExp(`<g:id>${product.productCode}<\\/g:id>[\\s\\S]*?<g:mpn>${product.productCode}<\\/g:mpn>`));
  }
});

test("product transparency uses the confirmed PRC origin and supplies AM/PM guidance", () => {
  const product = {
    ...fallbackProducts[0],
    countryOfOrigin: "CN",
    directions: "Apply after serum as the moisturizer step.",
    suitableFor: "Dry or dehydrated-feeling skin.",
    cautionFor: null
  };
  const routine = buildProductRoutine(product);
  const faqs = buildProductFaqs(product);

  assert.equal(formatProductOrigin(product.countryOfOrigin), "Made in PRC");
  assert.equal(routine.am.length, 3);
  assert.equal(routine.pm.length, 3);
  assert.ok(faqs.some((faq) => faq.question.includes("patch test") || faq.answer.includes("Patch test")));
});

test("every product page can show four unique related products", () => {
  for (const product of fallbackProducts) {
    const relatedSlugs = new Set(
      getCollectionsForProduct(product.slug).flatMap((collection) => [
        ...collection.productSlugs,
        ...(collection.contextProductSlugs || [])
      ])
    );
    relatedSlugs.delete(product.slug);
    const relatedProducts = selectRelatedProducts(product, fallbackProducts, relatedSlugs, 4);

    assert.equal(relatedProducts.length, 4);
    assert.equal(new Set(relatedProducts.map((candidate) => candidate.slug)).size, 4);
    assert.equal(relatedProducts.some((candidate) => candidate.slug === product.slug), false);
  }
});

test("about page is included in the canonical sitemap", async () => {
  const entries = await sitemap();
  assert.equal(entries.some((entry) => entry.url.endsWith("/about")), true);
});
