import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "@/app/sitemap";
import { fallbackProducts, fallbackReviews } from "@/lib/fallback-data";
import {
  canMarkReviewAsVerified,
  getCompliantReviewStatus,
  SYNTHETIC_REVIEW_SOURCE
} from "@/lib/review-compliance";
import { noIndexRobots } from "@/lib/seo";
import { resolveSeoRoute } from "@/lib/seo-routing";
import { siteConfig } from "@/lib/site-config";

test("canonical site URL uses the final www host", () => {
  assert.equal(siteConfig.url, "https://www.neatiquebeauty.com");
});

test("apex requests permanently resolve to the canonical HTTPS host", () => {
  const decision = resolveSeoRoute(
    new URL("http://neatiquebeauty.com/shop/pdrn-serum?utm_source=search")
  );

  assert.deepEqual(decision, {
    type: "redirect",
    destination:
      "https://www.neatiquebeauty.com/shop/pdrn-serum?utm_source=search"
  });
});

test("known WordPress URLs resolve directly to their replacement without legacy queries", () => {
  assert.deepEqual(
    resolveSeoRoute(
      new URL("https://neatiquebeauty.com/?p=3833&post_type=product")
    ),
    {
      type: "redirect",
      destination: "https://www.neatiquebeauty.com/shop/snail-mucin-serum"
    }
  );

  assert.deepEqual(
    resolveSeoRoute(new URL("https://www.neatiquebeauty.com/?page_id=3783")),
    {
      type: "redirect",
      destination: "https://www.neatiquebeauty.com/shipping-policy"
    }
  );

  assert.deepEqual(
    resolveSeoRoute(
      new URL("https://www.neatiquebeauty.com/shop?product_view=list")
    ),
    {
      type: "redirect",
      destination: "https://www.neatiquebeauty.com/shop"
    }
  );
});

test("retired or unknown WordPress URLs return gone instead of duplicate content", () => {
  assert.deepEqual(
    resolveSeoRoute(new URL("https://www.neatiquebeauty.com/?p=999999")),
    { type: "gone" }
  );
  assert.deepEqual(
    resolveSeoRoute(
      new URL("https://www.neatiquebeauty.com/tag/tranexamic-acid-serum")
    ),
    { type: "gone" }
  );
  assert.deepEqual(
    resolveSeoRoute(new URL("https://www.neatiquebeauty.com/test-campaign")),
    { type: "gone" }
  );
});

test("canonical URLs do not trigger an SEO redirect", () => {
  assert.equal(
    resolveSeoRoute(new URL("https://www.neatiquebeauty.com/shop/pdrn-serum")),
    null
  );
});

test("synthetic reviews can never be published or verified", () => {
  assert.equal(
    getCompliantReviewStatus(SYNTHETIC_REVIEW_SOURCE, "PUBLISHED"),
    "HIDDEN"
  );
  assert.equal(
    canMarkReviewAsVerified({
      source: SYNTHETIC_REVIEW_SOURCE,
      orderId: "order_1"
    }),
    false
  );
  assert.equal(
    canMarkReviewAsVerified({ source: "CUSTOMER", orderId: null }),
    false
  );
  assert.equal(
    canMarkReviewAsVerified({ source: "CUSTOMER", orderId: "order_1" }),
    true
  );
});

test("database outages never manufacture fallback social proof", () => {
  assert.deepEqual(fallbackReviews, []);
  assert.ok(
    fallbackProducts.every(
      (product) => product.reviewCount === 0 && product.averageRating === null
    )
  );
});

test("utility pages use noindex,follow", () => {
  assert.equal((noIndexRobots as { index?: boolean }).index, false);
  assert.equal((noIndexRobots as { follow?: boolean }).follow, true);
});

test("sitemap only emits canonical www URLs and excludes private flows", async () => {
  const entries = await sitemap();

  assert.ok(entries.length > 0);
  assert.ok(
    entries.every((entry) => entry.url.startsWith("https://www.neatiquebeauty.com"))
  );
  assert.equal(entries.some((entry) => entry.url.endsWith("/rd")), false);
  assert.equal(entries.some((entry) => entry.url.endsWith("/ryo")), false);
});
