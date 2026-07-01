import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOmbClaimProgressHref,
  getOmbClaimResumePath,
  isFreshOmbClaimProgressSnapshot
} from "@/lib/order-match-progress";

test("getOmbClaimResumePath routes incomplete order-only claims to step 2", () => {
  assert.equal(getOmbClaimResumePath({ id: "claim-1" }), "/om2?claim=claim-1");
});

test("getOmbClaimResumePath routes high-rating reviewed claims to last step", () => {
  assert.equal(
    getOmbClaimResumePath({
      id: "claim-2",
      purchasedProduct: "SE96 Snail Mucin Serum",
      reviewRating: 5,
      commentText: "Loved the texture and glow."
    }),
    "/om3?claim=claim-2"
  );
});

test("getOmbClaimResumePath routes completed claims to thank-you page", () => {
  assert.equal(
    getOmbClaimResumePath({
      id: "claim-3",
      completedAt: new Date("2026-07-01T00:00:00.000Z")
    }),
    "/om2/thank-you?claim=claim-3"
  );
});

test("buildOmbClaimProgressHref mirrors stored progress step", () => {
  assert.equal(buildOmbClaimProgressHref({ claimId: "claim-4", step: "step-2" }), "/om2?claim=claim-4");
  assert.equal(buildOmbClaimProgressHref({ claimId: "claim-4", step: "last-step" }), "/om3?claim=claim-4");
});

test("isFreshOmbClaimProgressSnapshot rejects stale browser progress", () => {
  const now = Date.parse("2026-07-01T00:00:00.000Z");

  assert.equal(
    isFreshOmbClaimProgressSnapshot(
      {
        version: 1,
        processKey: "OMB",
        claimId: "claim-5",
        step: "last-step",
        platformKey: "tiktok",
        platformLabel: "TikTok",
        orderId: "577446362433360581",
        name: "Brandy Arellano",
        email: "brandy@example.com",
        updatedAt: "2026-05-01T00:00:00.000Z"
      },
      now
    ),
    false
  );
});
