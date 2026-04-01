import { siteConfig } from "@/lib/site-config";

const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
const DEFAULT_OPENAI_REVIEW_MODEL =
  process.env.OPENAI_REVIEW_MODEL || process.env.OPENAI_EMAIL_MODEL || "gpt-5.4-mini";

type ProductReviewContext = {
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
};

type ExistingReviewContext = {
  rating: number;
  title: string;
  content: string;
  displayName: string;
};

export type ReviewReferenceExample = {
  displayName: string;
  rating: number | null;
  title: string;
  content: string;
};

export type GeneratedAiReviewDraft = {
  displayName: string;
  rating: number;
  title: string;
  content: string;
};

type GenerateAiReviewDraftsInput = {
  product: ProductReviewContext;
  quantity: number;
  existingReviews: ExistingReviewContext[];
  referenceReviews: ReviewReferenceExample[];
};

function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

export function getOpenAiReviewSettings() {
  const apiKey = getOpenAiApiKey();

  return {
    ready: Boolean(apiKey),
    model: DEFAULT_OPENAI_REVIEW_MODEL,
    apiKeyConfigured: Boolean(apiKey)
  };
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

function buildProductSummary(product: ProductReviewContext) {
  return [
    `Product: ${product.name}`,
    `Product code: ${product.productCode || "Not set"}`,
    `Product short name: ${product.productShortName || "Not set"}`,
    `Product URL: ${siteConfig.url}/shop/${product.slug}`,
    `Category: ${product.category}`,
    `Tagline: ${product.tagline}`,
    `Short description: ${product.shortDescription}`,
    `Description: ${product.description}`,
    `Details: ${product.details}`
  ].join("\n");
}

function buildExistingReviewSummary(reviews: ExistingReviewContext[]) {
  if (reviews.length === 0) {
    return "No existing reviews were supplied.";
  }

  return reviews
    .slice(0, 16)
    .map(
      (review, index) =>
        `${index + 1}. ${review.displayName} | ${review.rating} stars | ${review.title}\n${review.content.slice(0, 280)}`
    )
    .join("\n\n");
}

function buildReferenceSummary(reviews: ReviewReferenceExample[]) {
  if (reviews.length === 0) {
    return "No reference review file was uploaded.";
  }

  return reviews
    .slice(0, 24)
    .map(
      (review, index) =>
        `${index + 1}. ${review.displayName || "Anonymous"} | ${review.rating ?? "n/a"} stars | ${review.title}\n${review.content.slice(0, 320)}`
    )
    .join("\n\n");
}

function normalizeGeneratedDraft(draft: any, index: number): GeneratedAiReviewDraft | null {
  if (!draft || typeof draft !== "object") {
    return null;
  }

  const displayName = typeof draft.displayName === "string" ? draft.displayName.trim() : "";
  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const content = typeof draft.content === "string" ? draft.content.replace(/\s+\n/g, "\n").trim() : "";
  const ratingNumber =
    typeof draft.rating === "number" ? Math.round(draft.rating) : Number.parseInt(String(draft.rating || ""), 10);

  if (!displayName || !title || !content || !Number.isFinite(ratingNumber)) {
    return null;
  }

  return {
    displayName,
    rating: Math.max(1, Math.min(5, ratingNumber)),
    title: title.slice(0, 120),
    content: content.slice(0, 2200)
  };
}

async function generateAiReviewBatch(
  input: GenerateAiReviewDraftsInput,
  quantity: number,
  previousDrafts: GeneratedAiReviewDraft[]
) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reviews: {
        type: "array",
        minItems: quantity,
        maxItems: quantity,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            displayName: { type: "string", minLength: 2, maxLength: 40 },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            title: { type: "string", minLength: 4, maxLength: 110 },
            content: { type: "string", minLength: 18, maxLength: 1400 }
          },
          required: ["displayName", "rating", "title", "content"]
        }
      }
    },
    required: ["reviews"]
  };

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_REVIEW_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You create internal review drafts for ecommerce moderation.",
                "Return only valid JSON matching the schema.",
                "Every review must feel like it was written by a different person.",
                "Vary sentence openings, rhythm, length, vocabulary, tone, and structure.",
                "Avoid repetitive openings such as 'I have been using', 'First impression', 'Short version', 'Routine note', and 'Honestly'.",
                "Do not copy phrases from reference reviews or existing reviews.",
                "Keep claims cosmetic and experience-based. Avoid medical claims, diagnosis language, cure language, or guaranteed outcomes.",
                "Keep the reviews realistic, specific, and natural for a skincare product page."
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
                `Generate ${quantity} unique review drafts for this product.`,
                "",
                "Product context:",
                buildProductSummary(input.product),
                "",
                "Existing reviews to avoid echoing too closely:",
                buildExistingReviewSummary(input.existingReviews),
                "",
                "Reference review examples uploaded by the team:",
                buildReferenceSummary(input.referenceReviews),
                "",
                previousDrafts.length > 0
                  ? `Drafts already generated in this run that must not be repeated:\n${previousDrafts
                      .map(
                        (review, index) =>
                          `${index + 1}. ${review.displayName} | ${review.rating} stars | ${review.title}\n${review.content.slice(0, 240)}`
                      )
                      .join("\n\n")}`
                  : "No drafts have been generated yet in this run.",
                "",
                "Generation requirements:",
                "- Use a realistic mix of short, medium, and longer reviews.",
                "- If no reference file is provided, skew naturally positive with mostly 4-5 star reviews and an occasional 3-star review.",
                "- If a reference file is provided, match its general style and rating feel without copying wording.",
                "- The title should look like a real review heading, not a marketing headline.",
                "- The body should read like a customer comment, not like a blog post or ad.",
                "- No markdown, no bullet points, no emojis, no hashtags, no all-caps titles.",
                "- Keep display names human and varied."
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
          name: "review_drafts",
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
    throw new Error("OpenAI did not return AI review drafts.");
  }

  const output = safeJsonParse(outputText);
  const normalizedOutput =
    output && typeof output === "object" ? (output as Record<string, unknown>) : null;
  const rows = Array.isArray(normalizedOutput?.reviews) ? normalizedOutput.reviews : [];

  const drafts = rows
    .map((row, index) => normalizeGeneratedDraft(row, index))
    .filter((row): row is GeneratedAiReviewDraft => Boolean(row));

  if (drafts.length !== quantity) {
    throw new Error("OpenAI returned an incomplete AI review batch.");
  }

  return drafts;
}

export async function generateAiReviewDrafts(
  input: GenerateAiReviewDraftsInput
): Promise<GeneratedAiReviewDraft[]> {
  const totalQuantity = Math.max(1, Math.min(100, Math.round(input.quantity)));
  const drafts: GeneratedAiReviewDraft[] = [];
  const batchSize = 20;

  for (let offset = 0; offset < totalQuantity; offset += batchSize) {
    const currentBatchSize = Math.min(batchSize, totalQuantity - offset);
    const batchDrafts = await generateAiReviewBatch(input, currentBatchSize, drafts);
    drafts.push(...batchDrafts);
  }

  return drafts;
}
