import assert from "node:assert/strict";
import test from "node:test";
import {
  hashEmailVerificationCode,
  maskEmail,
  verifyEmailVerificationCode
} from "../lib/guest-rewards";

process.env.GUEST_REWARD_VERIFICATION_SECRET = "test-only-guest-reward-secret";

test("mascot redemption codes are bound to draft and email", () => {
  const expectedHash = hashEmailVerificationCode({
    draftId: "draft-one",
    email: "Guest@Example.com",
    code: "123456"
  });

  assert.equal(
    verifyEmailVerificationCode({
      draftId: "draft-one",
      email: "guest@example.com",
      code: "123456",
      expectedHash
    }),
    true
  );
  assert.equal(
    verifyEmailVerificationCode({
      draftId: "draft-two",
      email: "guest@example.com",
      code: "123456",
      expectedHash
    }),
    false
  );
  assert.equal(
    verifyEmailVerificationCode({
      draftId: "draft-one",
      email: "attacker@example.com",
      code: "123456",
      expectedHash
    }),
    false
  );
});

test("verification email masking keeps only a short local-part prefix", () => {
  assert.equal(maskEmail("simon@example.com"), "si***@example.com");
  assert.equal(maskEmail("a@example.com"), "a**@example.com");
});
