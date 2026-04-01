import { normalizeArticleContent } from "@/lib/article-format";
import { siteConfig } from "@/lib/site-config";
import { slugify } from "@/lib/utils";

const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
const DEFAULT_OPENAI_POST_MODEL = process.env.OPENAI_POST_MODEL || process.env.OPENAI_EMAIL_MODEL || "gpt-5.4-mini";
const DEFAULT_OPENAI_POST_IMAGE_MODEL = process.env.OPENAI_POST_IMAGE_MODEL || "gpt-image-1";

type ProductContext = {
  id: string;
  productCode: string | null;
  productShortName: string | null;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  shortDescription: string;
  description: string;
  details: string;
  imageUrl: string;
  priceCents: number;
  compareAtPriceCents: number | null;
};

type ExistingPostContext = {
  title: string;
  slug: string;
  focusKeyword: string | null;
};

type AllowedExternalReference = {
  label: string;
  url: string;
  reason: string;
};

type GenerateSeoPostInput = {
  product: ProductContext;
  recentPosts: ExistingPostContext[];
  includeExternalLinks: boolean;
};

export type GeneratedSeoPostDraft = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readTime: number;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  coverImageAlt: string;
  imagePrompt: string;
  content: string;
  externalLinks: Array<{ label: string; url: string }>;
};

export type GeneratedPostImageAsset = {
  mimeType: string;
  base64Data: string;
};

export type PostImageReferenceAsset = {
  fileName: string;
  mimeType: string;
  data: Buffer;
};

function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

export function getOpenAiPostSettings() {
  const apiKey = getOpenAiApiKey();

  return {
    ready: Boolean(apiKey),
    model: DEFAULT_OPENAI_POST_MODEL,
    imageModel: DEFAULT_OPENAI_POST_IMAGE_MODEL,
    apiKeyConfigured: Boolean(apiKey)
  };
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function getAllowedExternalReferences(product: ProductContext): AllowedExternalReference[] {
  const isCream = /cream|moisturizer/i.test(product.name) || /cream|moisturizer/i.test(product.category);
  const isSerum = /serum/i.test(product.name) || /serum/i.test(product.category);

  const baseReferences: AllowedExternalReference[] = [
    {
      label: "American Academy of Dermatology: skin care basics",
      url: "https://www.aad.org/public/everyday-care/skin-care-basics",
      reason: "Helpful people-first skin care basics reference from a recognized dermatology organization."
    },
    {
      label: "American Academy of Dermatology: how to apply skin care products",
      url: "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/apply-skin-care-products",
      reason: "Useful layering and routine-order guidance when an article discusses how to use a product."
    }
  ];

  if (isCream) {
    baseReferences.push({
      label: "American Academy of Dermatology: moisturizer tips",
      url: "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/moisturizer",
      reason: "Relevant when the post discusses cream textures, moisture support, or final-step routines."
    });
  }

  if (isSerum) {
    baseReferences.push({
      label: "American Academy of Dermatology: face serum guidance",
      url: "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/face-serum",
      reason: "Relevant when the post explains serum texture, first-step treatment use, or layering."
    });
  }

  return baseReferences;
}

function buildProductSummary(product: ProductContext) {
  const compareAt =
    typeof product.compareAtPriceCents === "number" && product.compareAtPriceCents > product.priceCents
      ? ` (compare at ${formatCurrency(product.compareAtPriceCents)})`
      : "";

  return [
    `Product name: ${product.name}`,
    `Product code: ${product.productCode || "Not set"}`,
    `Product short name: ${product.productShortName || "Not set"}`,
    `Product URL: ${siteConfig.url}/shop/${product.slug}`,
    `Category: ${product.category}`,
    `Tagline: ${product.tagline}`,
    `Short description: ${product.shortDescription}`,
    `Long description: ${product.description}`,
    `Details: ${product.details}`,
    `Image URL: ${product.imageUrl}`,
    `Price: ${formatCurrency(product.priceCents)}${compareAt}`
  ].join("\n");
}

function buildRecentPostSummary(posts: ExistingPostContext[]) {
  if (posts.length === 0) {
    return "No previous AI posts exist for this product yet.";
  }

  return posts
    .map((post) => `- ${post.title} | ${post.slug} | Focus keyword: ${post.focusKeyword || "n/a"}`)
    .join("\n");
}

function buildExternalReferenceSummary(references: AllowedExternalReference[]) {
  if (references.length === 0) {
    return "No external links are approved for this generation.";
  }

  return references
    .map((reference) => `- ${reference.label}\n  URL: ${reference.url}\n  Reason: ${reference.reason}`)
    .join("\n");
}

function getResponseOutputText(response: any) {
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

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractOpenAiErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return null;
}

function normalizeExternalLinks(
  links: Array<{ label: string; url: string }> | undefined,
  allowedReferences: AllowedExternalReference[],
  includeExternalLinks: boolean
) {
  if (!includeExternalLinks || !Array.isArray(links) || links.length === 0) {
    return [];
  }

  const allowedUrlSet = new Set(allowedReferences.map((reference) => reference.url));

  return links
    .filter((link) => link && typeof link.label === "string" && typeof link.url === "string")
    .filter((link) => allowedUrlSet.has(link.url))
    .slice(0, 2)
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim()
    }))
    .filter((link) => Boolean(link.label) && Boolean(link.url));
}

function buildBrandedPostImagePrompt(basePrompt: string, product: ProductContext) {
  const productReference = product.productShortName || product.productCode || product.name;

  return [
    basePrompt.trim(),
    `Editorial direction: center the visual around Neatique ${productReference}.`,
    "Preferred scenes are either a premium Neatique product lifestyle composition with clearly branded packaging or a polished model application image where no product is visible at all.",
    "Do not show generic unlabeled skincare bottles, jars, tubes, droppers, or packaging from any other brand.",
    "If a product appears, it must look like authentic Neatique packaging in a refined vanity or skincare setting.",
    "If the image uses a model, keep the focus on texture, routine, and skin feel without showing unbranded products.",
    "No text, no watermark, no collage, no floating stock product packshots, and no competitor branding."
  ].join(" ");
}

export async function generateSeoPostDraftWithAi(
  input: GenerateSeoPostInput
): Promise<GeneratedSeoPostDraft> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const allowedExternalReferences = getAllowedExternalReferences(input.product);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 18, maxLength: 120 },
      slug: { type: "string", minLength: 12, maxLength: 120 },
      excerpt: { type: "string", minLength: 80, maxLength: 220 },
      category: { type: "string", minLength: 4, maxLength: 40 },
      readTime: { type: "integer", minimum: 4, maximum: 12 },
      seoTitle: { type: "string", minLength: 20, maxLength: 70 },
      seoDescription: { type: "string", minLength: 120, maxLength: 160 },
      focusKeyword: { type: "string", minLength: 8, maxLength: 80 },
      secondaryKeywords: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string", minLength: 4, maxLength: 80 }
      },
      coverImageAlt: { type: "string", minLength: 20, maxLength: 140 },
      imagePrompt: { type: "string", minLength: 40, maxLength: 500 },
      content: { type: "string", minLength: 1200, maxLength: 9000 },
      externalLinks: {
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string", minLength: 6, maxLength: 90 },
            url: { type: "string", minLength: 10, maxLength: 240 }
          },
          required: ["label", "url"]
        }
      }
    },
    required: [
      "title",
      "slug",
      "excerpt",
      "category",
      "readTime",
      "seoTitle",
      "seoDescription",
      "focusKeyword",
      "secondaryKeywords",
      "coverImageAlt",
      "imagePrompt",
      "content",
      "externalLinks"
    ]
  };

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_POST_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are Neatique's senior SEO editor and beauty content strategist.",
                "Create people-first skincare content that is useful, original, product-aware, and safe for Google indexing.",
                "Do not write scaled-content fluff, doorway pages, spun content, fake reviews, fabricated statistics, or unsupported scientific claims.",
                "Avoid medical claims, cure language, guaranteed outcomes, diagnosis language, or before-and-after promises.",
                "Write in polished American English for women shopping skincare in the United States.",
                "Use simple markdown in the article body: ## for main section headings, ### for subheadings, and - for bullet lists.",
                "The article should feel editorial, genuinely helpful, and commercially relevant without sounding like thin affiliate content.",
                "Only use external links from the approved list. If none fit naturally, return an empty externalLinks array.",
                "Return only valid JSON matching the schema."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Brand: ${siteConfig.title} (${siteConfig.url})`,
                "Goal: create a Beauty Tips post that can rank for relevant product keywords, help readers, and naturally support the related product page.",
                "Product context:",
                buildProductSummary(input.product),
                "",
                "Recent AI post angles to avoid repeating too closely:",
                buildRecentPostSummary(input.recentPosts),
                "",
                `External links enabled: ${input.includeExternalLinks ? "yes" : "no"}`,
                "Approved external references:",
                buildExternalReferenceSummary(allowedExternalReferences),
                "",
                "Article requirements:",
                "- Write a real SEO article, not a product description.",
                "- Focus on one primary keyword and support it with 3 to 6 secondary keywords.",
                "- Use headings that reflect real search intent.",
                "- Include a short FAQ section in the body when relevant.",
                "- Mention the product naturally and reference its routine fit, texture, and use case.",
                "- Keep the article original relative to previous posts for this product.",
                "- Do not mention Google, SEO, rankings, or optimization inside the article.",
                "- Do not use competitor brand names.",
                "- Avoid keyword stuffing and keep the tone editorial.",
                "- The cover image prompt should describe a premium editorial skincare visual with no text on the image."
              ].join("\n")
            }
          ]
        }
      ],
      reasoning: {
        effort: "medium"
      },
      text: {
        format: {
          type: "json_schema",
          name: "seo_post_draft",
          strict: true,
          schema
        }
      }
    })
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI request failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getResponseOutputText(parsed);

  if (!outputText) {
    throw new Error("OpenAI did not return an SEO post draft.");
  }

  const output = safeJsonParse(outputText);
  const normalizedOutput =
    output && typeof output === "object" ? (output as Record<string, unknown>) : null;

  if (
    !normalizedOutput ||
    typeof normalizedOutput.title !== "string" ||
    typeof normalizedOutput.slug !== "string" ||
    typeof normalizedOutput.excerpt !== "string" ||
    typeof normalizedOutput.category !== "string" ||
    typeof normalizedOutput.readTime !== "number" ||
    typeof normalizedOutput.seoTitle !== "string" ||
    typeof normalizedOutput.seoDescription !== "string" ||
    typeof normalizedOutput.focusKeyword !== "string" ||
    !Array.isArray(normalizedOutput.secondaryKeywords) ||
    typeof normalizedOutput.coverImageAlt !== "string" ||
    typeof normalizedOutput.imagePrompt !== "string" ||
    typeof normalizedOutput.content !== "string"
  ) {
    throw new Error("OpenAI returned an invalid SEO post draft.");
  }

  return {
    title: normalizedOutput.title.trim(),
    slug: slugify(String(normalizedOutput.slug).trim()),
    excerpt: normalizedOutput.excerpt.trim(),
    category: normalizedOutput.category.trim(),
    readTime: Math.max(4, Math.min(12, Math.round(normalizedOutput.readTime))),
    seoTitle: normalizedOutput.seoTitle.trim(),
    seoDescription: normalizedOutput.seoDescription.trim(),
    focusKeyword: normalizedOutput.focusKeyword.trim(),
    secondaryKeywords: normalizedOutput.secondaryKeywords
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6),
    coverImageAlt: normalizedOutput.coverImageAlt.trim(),
    imagePrompt: buildBrandedPostImagePrompt(normalizedOutput.imagePrompt.trim(), input.product),
    content: normalizeArticleContent(normalizedOutput.content),
    externalLinks: normalizeExternalLinks(
      Array.isArray(normalizedOutput.externalLinks)
        ? (normalizedOutput.externalLinks as Array<{ label: string; url: string }>)
        : [],
      allowedExternalReferences,
      input.includeExternalLinks
    )
  };
}

export async function generateSeoPostImageWithAi(prompt: string): Promise<GeneratedPostImageAsset> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await fetch(`${OPENAI_API_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_POST_IMAGE_MODEL,
      prompt,
      size: "1536x1024",
      quality: "medium"
    })
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI image generation failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";

  if (!base64Data) {
    throw new Error("OpenAI did not return a cover image.");
  }

  return {
    mimeType: "image/png",
    base64Data
  };
}

export async function generateSeoPostImageFromProductReferenceWithAi(
  prompt: string,
  referenceImage: PostImageReferenceAsset
): Promise<GeneratedPostImageAsset> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const formData = new FormData();
  formData.append("model", DEFAULT_OPENAI_POST_IMAGE_MODEL);
  formData.append("prompt", [
    prompt,
    "Use the supplied product image as the reference for packaging shape, label placement, brand palette, and overall product identity.",
    "Turn that core product into a premium editorial scene image rather than returning a simple cutout or plain product packshot."
  ].join(" "));
  formData.append("size", "1536x1024");
  formData.append("quality", "medium");
  formData.append(
    "image",
    new Blob([new Uint8Array(referenceImage.data)], { type: referenceImage.mimeType }),
    referenceImage.fileName
  );

  const response = await fetch(`${OPENAI_API_BASE_URL}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const rawText = await response.text();
  const parsed = rawText ? safeJsonParse(rawText) : null;

  if (!response.ok) {
    const parsedRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const message =
      (parsedRecord && "error" in parsedRecord
        ? extractOpenAiErrorMessage(parsedRecord.error)
        : null) || `OpenAI image edit failed with ${response.status}.`;
    throw new Error(message);
  }

  const data = parsed && typeof parsed === "object" && Array.isArray((parsed as any).data) ? (parsed as any).data : [];
  const base64Data = typeof data?.[0]?.b64_json === "string" ? data[0].b64_json.trim() : "";

  if (!base64Data) {
    throw new Error("OpenAI did not return a cover image from the product reference.");
  }

  return {
    mimeType: "image/png",
    base64Data
  };
}
