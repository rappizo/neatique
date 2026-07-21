const DEFAULT_APIYI_BASE_URL = "https://api.apiyi.com/v1";
const DEFAULT_APIYI_TEXT_MODEL = "gpt-5.4-mini";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getApiYiBaseSettings() {
  const apiKey = (process.env.APIYI_API_KEY || "").trim();
  const baseUrl = normalizeBaseUrl(process.env.APIYI_BASE_URL || DEFAULT_APIYI_BASE_URL);

  return {
    ready: Boolean(apiKey && baseUrl),
    apiKey,
    baseUrl,
    apiKeyConfigured: Boolean(apiKey)
  };
}

export function getApiYiTextSettings() {
  const baseSettings = getApiYiBaseSettings();
  const model = (process.env.AI_TEXT_MODEL || DEFAULT_APIYI_TEXT_MODEL).trim();

  return {
    ...baseSettings,
    ready: Boolean(baseSettings.ready && model),
    model
  };
}

export function getApiYiResponseOutputText(response: any) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const outputBlocks = Array.isArray(response?.output) ? response.output : [];

  for (const block of outputBlocks) {
    const contents = Array.isArray(block?.content) ? block.content : [];
    for (const content of contents) {
      if (typeof content?.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
}

export function extractApiYiErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return null;
}
