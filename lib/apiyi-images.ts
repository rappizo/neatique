const DEFAULT_APIYI_BASE_URL = "https://api.apiyi.com/v1";
const DEFAULT_APIYI_IMAGE_MODEL = "gemini-3.1-flash-image";

export type ApiYiReferenceImage = {
  mimeType: string;
  data: Buffer;
};

export type ApiYiGeneratedImage = {
  mimeType: string;
  data: Buffer;
};

export type GenerateApiYiImageInput = {
  prompt: string;
  referenceImages?: ApiYiReferenceImage[];
  aspectRatio?: "1:1" | "3:2" | "4:3" | "16:9" | "9:16";
  imageSize?: "1K" | "2K" | "4K";
};

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getApiYiImageSettings() {
  const apiKey = (process.env.APIYI_API_KEY || "").trim();
  const baseUrl = normalizeBaseUrl(process.env.APIYI_BASE_URL || DEFAULT_APIYI_BASE_URL);
  const model = (process.env.AI_IMAGE_MODEL || DEFAULT_APIYI_IMAGE_MODEL).trim();

  return {
    ready: Boolean(apiKey && baseUrl && model),
    apiKey,
    baseUrl,
    model
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractDataUrl(value: string) {
  const match = value.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\r\n]+)/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: Buffer.from(match[2].replace(/\s/g, ""), "base64")
  };
}

function collectImageCandidates(
  value: unknown,
  path: string[] = [],
  candidates: Array<{ value: string; path: string[] }> = []
) {
  if (typeof value === "string") {
    candidates.push({ value, path });
    return candidates;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectImageCandidates(item, [...path, String(index)], candidates));
    return candidates;
  }

  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      collectImageCandidates(child, [...path, key], candidates);
    });
  }

  return candidates;
}

function mimeTypeFromUrl(value: string) {
  const pathname = (() => {
    try {
      return new URL(value).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".gif")) return "image/gif";
  return "image/png";
}

async function downloadGeneratedImage(url: string, apiKey: string): Promise<ApiYiGeneratedImage> {
  let response = await fetch(url, {
    signal: AbortSignal.timeout(120_000)
  });

  if (response.status === 401 || response.status === 403) {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(120_000)
    });
  }

  if (!response.ok) {
    throw new Error(`APIYI returned an image URL that could not be downloaded (${response.status}).`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
  const mimeType = contentType?.startsWith("image/") ? contentType : mimeTypeFromUrl(url);

  return {
    mimeType,
    data: Buffer.from(await response.arrayBuffer())
  };
}

async function extractGeneratedImage(payload: unknown, apiKey: string) {
  const candidates = collectImageCandidates(payload);

  for (const candidate of candidates) {
    const dataUrl = extractDataUrl(candidate.value);

    if (dataUrl?.data.length) {
      return dataUrl;
    }
  }

  const directBase64 = candidates.find(({ path, value }) => {
    const key = path.at(-1)?.toLowerCase();
    return key === "b64_json" && /^[a-zA-Z0-9+/=\r\n]+$/.test(value);
  });

  if (directBase64) {
    return {
      mimeType: "image/png",
      data: Buffer.from(directBase64.value.replace(/\s/g, ""), "base64")
    };
  }

  for (const candidate of candidates) {
    const markdownUrl = candidate.value.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/)?.[1];
    const directUrl = candidate.value.trim().match(/^https?:\/\/\S+$/)?.[0];
    const pathSuggestsImage = candidate.path.some((part) => /image|url/i.test(part));
    const embeddedUrl = pathSuggestsImage
      ? candidate.value.match(/https?:\/\/[^\s"')]+/)?.[0]
      : null;
    const url = markdownUrl || directUrl || embeddedUrl;

    if (url) {
      return downloadGeneratedImage(url, apiKey);
    }
  }

  throw new Error("APIYI did not return a readable generated image.");
}

export async function generateImageWithApiYi(
  input: GenerateApiYiImageInput
): Promise<ApiYiGeneratedImage> {
  const settings = getApiYiImageSettings();

  if (!settings.ready) {
    throw new Error("APIYI image generation is not configured.");
  }

  const referenceImages = input.referenceImages || [];
  const content = referenceImages.length > 0
    ? [
        { type: "text", text: input.prompt },
        ...referenceImages.map((image) => ({
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.data.toString("base64")}`
          }
        }))
      ]
    : input.prompt;

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: "user", content }],
      image_config: {
        aspect_ratio: input.aspectRatio || "16:9",
        image_size: input.imageSize || "2K"
      }
    }),
    signal: AbortSignal.timeout(240_000)
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const errorMessage = parsed && typeof parsed === "object"
      ? JSON.stringify(parsed).slice(0, 800)
      : rawText.slice(0, 800);
    throw new Error(`APIYI image generation failed (${response.status}): ${errorMessage}`);
  }

  return extractGeneratedImage(parsed, settings.apiKey);
}
