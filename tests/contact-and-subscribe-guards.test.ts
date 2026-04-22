import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeContactSubmissionInput,
  validateContactSubmissionInput
} from "../lib/contact-guard";
import {
  normalizeSubscribeSubmissionInput,
  validateSubscribeSubmissionInput
} from "../lib/subscribe-guard";

test("contact normalization trims and lowers email input", () => {
  const formData = new FormData();
  formData.set("name", "  Ava Miller  ");
  formData.set("email", "  AVA@Example.com ");
  formData.set("subject", "  Need help with order  ");
  formData.set("message", "  My order arrived safely, but I need help with usage directions.  ");
  formData.set("website", "");
  formData.set("startedAt", "1710000000000");

  const normalized = normalizeContactSubmissionInput(formData);
  assert.equal(normalized.name, "Ava Miller");
  assert.equal(normalized.email, "ava@example.com");
  assert.equal(normalized.subject, "Need help with order");
  assert.match(normalized.message, /^My order arrived safely/);
  assert.equal(validateContactSubmissionInput(normalized), null);
});

test("contact validation rejects incomplete submissions", () => {
  const formData = new FormData();
  formData.set("name", "A");
  formData.set("email", "bad-email");
  formData.set("subject", "Hi");
  formData.set("message", "short");

  const normalized = normalizeContactSubmissionInput(formData);
  assert.equal(validateContactSubmissionInput(normalized), "Please provide your name.");
});

test("subscribe validation rejects bad emails and preserves honeypot", () => {
  const formData = new FormData();
  formData.set("email", "  invalid ");
  formData.set("company", "bot-field");

  const normalized = normalizeSubscribeSubmissionInput(formData);
  assert.equal(normalized.company, "bot-field");
  assert.equal(validateSubscribeSubmissionInput(normalized), "Please provide a valid email address.");
});
