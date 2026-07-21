import { normalizeArticleContent } from "@/lib/article-format";
import { generateImageWithApiYi, getApiYiImageSettings } from "@/lib/apiyi-images";
import {
  extractApiYiErrorMessage,
  getApiYiResponseOutputText,
  getApiYiTextSettings
} from "@/lib/apiyi";
import { siteConfig } from "@/lib/site-config";
import { slugify } from "@/lib/utils";

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

export function getApiYiPostSettings() {
  const textSettings = getApiYiTextSettings();
  const apiYiImageSettings = getApiYiImageSettings();

  return {
    ready: textSettings.ready && apiYiImageSettings.ready,
    model: textSettings.model,
    imageModel: apiYiImageSettings.model,
    apiKeyConfigured: textSettings.apiKeyConfigured
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
      label: "American Academy of Dermatology: skin care products guide",
      url: "https://www.aad.org/public/skin-hair-nails/skin-care/skin-care-products",
      reason: "A live, article-level dermatologist resource that helps explain product types and routine fit."
    },
    {
      label: "Cleveland Clinic: proper skin care product order",
      url: "https://health.clevelandclinic.org/proper-skin-care-product-order",
      reason: "A live, article-level routine-order reference that works well when a post explains layering and timing."
    }
  ];

  if (isCream) {
    baseReferences.push({
      label: "American Academy of Dermatology: how to pick a moisturizer for dry skin",
      url: "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
      reason: "A live, article-level moisturizer guide that fits cream, comfort, and barrier-support topics."
    });
  }

  if (isSerum) {
    baseReferences.push({
      label: "Cleveland Clinic: skin care ingredients explained",
      url: "https://health.clevelandclinic.org/skin-care-ingredients-explained",
      reason: "A live, article-level explainer that supports ingredient-led serum education without using vague category pages."
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

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeExternalLinks(
  links: Array<{ label: string; url: string }> | undefined,
  allowedReferences: AllowedExternalReference[],
  includeExternalLinks: boolean
) {
  if (!includeExternalLinks || !Array.isArray(links) || links.length === 0) {
    return [];
  }

  const allowedReferencesByUrl = new Map(
    allowedReferences.map((reference) => [reference.url, reference])
  );

  return links
    .filter((link) => link && typeof link.label === "string" && typeof link.url === "string")
    .filter((link) => allowedReferencesByUrl.has(link.url))
    .slice(0, 2)
    .map((link) => {
      const normalizedUrl = link.url.trim();
      const matchedReference = allowedReferencesByUrl.get(normalizedUrl);

      return {
        label: matchedReference?.label || link.label.trim(),
        url: normalizedUrl
      };
    })
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
  const settings = getApiYiTextSettings();

  if (!settings.ready) {
    throw new Error("APIYI API key is not configured.");
  }

  const allowedExternalReferences = getAllowedExternalReferences(input.product);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 18, maxLength: 90 },
      slug: { type: "string", minLength: 12, maxLength: 120 },
      excerpt: { type: "string", minLength: 140, maxLength: 180 },
      category: { type: "string", minLength: 4, maxLength: 40 },
      readTime: { type: "integer", minimum: 4, maximum: 12 },
      seoTitle: { type: "string", minLength: 20, maxLength: 50 },
      seoDescription: { type: "string", minLength: 120, maxLength: 160 },
      focusKeyword: { type: "string", minLength: 8, maxLength: 80 },
      secondaryKeywords: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string", minLength: 4, maxLength: 80 }
      },
      coverImageAlt: { type: "string", minLength: 40, maxLength: 140 },
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

  const response = await fetch(`${settings.baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
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
                "- Open with a direct answer before background explanation.",
                "- Use headings that reflect real search intent.",
                "- Follow this section logic when relevant: direct answer, reader problem, practical method or comparison, AM/PM routine, when to simplify, and 3 to 5 FAQs.",
                "- Answer each section in its first sentence and avoid filler written only to reach a length.",
                "- Use one descriptive H1 title; the seoTitle must not include the brand because the site adds it automatically.",
                "- Mention the product naturally and reference its routine fit, texture, and use case.",
                `- Link naturally to the product with [descriptive anchor text](/shop/${input.product.slug}).`,
                "- Keep the article original relative to previous posts for this product.",
                "- Do not mention Google, SEO, rankings, or optimization inside the article.",
                "- Do not use competitor brand names.",
                "- Avoid keyword stuffing and keep the tone editorial.",
                "- The cover image prompt must describe a 16:9 premium editorial skincare visual with no overlay text and must require exact packaging when the product is visible.",
                "- Cover alt text must describe the visible scene naturally; do not stuff keywords."
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
        ? extractApiYiErrorMessage(parsedRecord.error)
        : null) || `APIYI request failed with ${response.status}.`;
    throw new Error(message);
  }

  const outputText = getApiYiResponseOutputText(parsed);

  if (!outputText) {
    throw new Error("APIYI did not return an SEO post draft.");
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
    throw new Error("APIYI returned an invalid SEO post draft.");
  }

  return {
    title: normalizedOutput.title.trim(),
    slug: slugify(String(normalizedOutput.slug).trim()),
    excerpt: normalizedOutput.excerpt.trim(),
    category: normalizedOutput.category.trim(),
    readTime: Math.max(4, Math.min(12, Math.round(normalizedOutput.readTime))),
    seoTitle: normalizedOutput.seoTitle.trim().replace(/\s*\|\s*Neatique(?: Beauty)?\s*$/i, ""),
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
  const apiYiImageSettings = getApiYiImageSettings();

  if (!apiYiImageSettings.ready) {
    throw new Error("APIYI image generation is not configured.");
  }

  const image = await generateImageWithApiYi({
    prompt,
    aspectRatio: "16:9",
    imageSize: "2K"
  });

  return {
    mimeType: image.mimeType,
    base64Data: image.data.toString("base64")
  };
}

export async function generateSeoPostImageFromProductReferenceWithAi(
  prompt: string,
  referenceImage: PostImageReferenceAsset
): Promise<GeneratedPostImageAsset> {
  const apiYiImageSettings = getApiYiImageSettings();

  if (!apiYiImageSettings.ready) {
    throw new Error("APIYI image generation is not configured.");
  }

  const image = await generateImageWithApiYi({
    prompt: [
      prompt,
      "Use the supplied product image as the binding reference for packaging shape, label placement, brand palette, and product identity.",
      "Preserve all visible product text exactly and do not invent or rearrange packaging copy.",
      "Turn the referenced product into a premium editorial scene rather than a simple cutout or plain packshot."
    ].join(" "),
    referenceImages: [{
      mimeType: referenceImage.mimeType,
      data: referenceImage.data
    }],
    aspectRatio: "16:9",
    imageSize: "2K"
  });

  return {
    mimeType: image.mimeType,
    base64Data: image.data.toString("base64")
  };
}
