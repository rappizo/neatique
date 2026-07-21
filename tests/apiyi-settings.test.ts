import assert from "node:assert/strict";
import test from "node:test";
import { getApiYiBaseSettings, getApiYiTextSettings } from "../lib/apiyi";
import { getApiYiImageSettings } from "../lib/apiyi-images";

test("APIYI settings use the shared key, base URL, and text/image model variables", () => {
  const previous = {
    apiKey: process.env.APIYI_API_KEY,
    baseUrl: process.env.APIYI_BASE_URL,
    textModel: process.env.AI_TEXT_MODEL,
    imageModel: process.env.AI_IMAGE_MODEL
  };

  process.env.APIYI_API_KEY = "test-apiyi-key";
  process.env.APIYI_BASE_URL = "https://gateway.example.com/v1/";
  process.env.AI_TEXT_MODEL = "test-text-model";
  process.env.AI_IMAGE_MODEL = "test-image-model";

  try {
    assert.deepEqual(getApiYiBaseSettings(), {
      ready: true,
      apiKey: "test-apiyi-key",
      baseUrl: "https://gateway.example.com/v1",
      apiKeyConfigured: true
    });
    assert.equal(getApiYiTextSettings().model, "test-text-model");
    assert.equal(getApiYiImageSettings().model, "test-image-model");
  } finally {
    restoreEnvironmentValue("APIYI_API_KEY", previous.apiKey);
    restoreEnvironmentValue("APIYI_BASE_URL", previous.baseUrl);
    restoreEnvironmentValue("AI_TEXT_MODEL", previous.textModel);
    restoreEnvironmentValue("AI_IMAGE_MODEL", previous.imageModel);
  }
});

function restoreEnvironmentValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
