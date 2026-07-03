import { siteConfig } from "@/lib/site-config";
import {
  formatReviewPersonaForPrompt,
  type ReviewPersonaForGeneration
} from "@/lib/review-personas";

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
  personaSlug: string;
  displayName: string;
  rating: number;
  title: string;
  content: string;
};

type GenerateAiReviewDraftsInput = {
  product: ProductReviewContext;
  quantity: number;
  existingReviews: ExistingReviewContext[];
  referenceReviews?: ReviewReferenceExample[];
  requiredRatings?: number[];
  personas?: ReviewPersonaForGeneration[];
};

const reviewFirstNames = [
  "Olivia",
  "Emma",
  "Sophia",
  "Ava",
  "Isabella",
  "Mia",
  "Charlotte",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Ella",
  "Scarlett",
  "Grace",
  "Lily",
  "Chloe",
  "Victoria",
  "Layla",
  "Nora",
  "Zoey"
];

const reviewLastNames = [
  "Parker",
  "Bennett",
  "Hayes",
  "Coleman",
  "Brooks",
  "Morgan",
  "Foster",
  "Reed",
  "Bryant",
  "Powell",
  "Ward",
  "Price",
  "Kelly",
  "Russell",
  "Diaz",
  "Rivera",
  "Hughes",
  "Jenkins",
  "Long",
  "Myers"
];

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

function buildPersonaSummary(personas: ReviewPersonaForGeneration[]) {
  if (personas.length === 0) {
    return "No buyer personas were supplied.";
  }

  return personas.map(formatReviewPersonaForPrompt).join("\n\n");
}

function buildFallbackFullName(index: number) {
  const firstName = reviewFirstNames[index % reviewFirstNames.length];
  const lastName = reviewLastNames[(index * 7 + 5) % reviewLastNames.length];
  return `${firstName} ${lastName}`;
}

function looksLikeAbbreviatedName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return true;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return true;
  }

  return parts.some((part) => {
    if (part.length <= 1) {
      return true;
    }

    if (/^[A-Z]\.?$/i.test(part)) {
      return true;
    }

    return false;
  });
}

function normalizeDisplayName(value: unknown, index: number) {
  const displayName = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

  if (!displayName || looksLikeAbbreviatedName(displayName)) {
    return buildFallbackFullName(index);
  }

  return displayName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeGeneratedDraft(
  draft: any,
  index: number,
  personas: ReviewPersonaForGeneration[]
): GeneratedAiReviewDraft | null {
  if (!draft || typeof draft !== "object") {
    return null;
  }

  const rawPersonaSlug = typeof draft.personaSlug === "string" ? draft.personaSlug.trim() : "";
  const expectedPersona = personas[index] ?? personas.find((persona) => persona.slug === rawPersonaSlug);
  const personaSlug = expectedPersona?.slug ?? rawPersonaSlug;
  const displayName = expectedPersona?.fullName ?? normalizeDisplayName(draft.displayName, index);
  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const content = typeof draft.content === "string" ? draft.content.replace(/\s+\n/g, "\n").trim() : "";
  const ratingNumber =
    typeof draft.rating === "number" ? Math.round(draft.rating) : Number.parseInt(String(draft.rating || ""), 10);

  if (!personaSlug || !displayName || !title || !content || !Number.isFinite(ratingNumber)) {
    return null;
  }

  return {
    personaSlug,
    displayName,
    rating: Math.max(1, Math.min(5, ratingNumber)),
    title: title.slice(0, 120),
    content: content.slice(0, 2200)
  };
}

async function generateAiReviewBatch(
  input: GenerateAiReviewDraftsInput,
  quantity: number,
  previousDrafts: GeneratedAiReviewDraft[],
  requiredRatings: number[]
) {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const referenceReviews = input.referenceReviews ?? [];
  const hasReferenceReviews = referenceReviews.length > 0;
  const personas = input.personas ?? [];
  const hasPersonas = personas.length > 0;
  const normalizedRequiredRatings =
    requiredRatings.length === quantity
      ? requiredRatings.map((rating) => Math.max(1, Math.min(5, Math.round(rating))))
      : [];
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
            personaSlug: { type: "string", minLength: 8, maxLength: 90 },
            displayName: { type: "string", minLength: 5, maxLength: 40 },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            title: { type: "string", minLength: 4, maxLength: 110 },
            content: { type: "string", minLength: 18, maxLength: 1400 }
          },
          required: ["personaSlug", "displayName", "rating", "title", "content"]
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
                "Every review must be written from the assigned buyer persona.",
                "Use the supplied persona full name as the displayName. Do not invent, shorten, or swap names.",
                "Each persona includes one randomly assigned review length target: short, medium, or long. Follow that target closely.",
                "Vary sentence openings, rhythm, length, vocabulary, tone, and structure.",
                "Avoid repetitive openings such as 'I have been using', 'First impression', 'Short version', 'Routine note', and 'Honestly'.",
                "Do not copy phrases from reference reviews or existing reviews.",
                "Reviewer names must be full names only, with a first name and last name. Do not use initials, abbreviations, or shortened last names.",
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
                "Buyer personas to simulate, in exact review order:",
                buildPersonaSummary(personas),
                "",
                "Existing reviews to avoid echoing too closely:",
                buildExistingReviewSummary(input.existingReviews),
                "",
                hasReferenceReviews
                  ? `Reference review examples uploaded by the team:\n${buildReferenceSummary(referenceReviews)}\n`
                  : "No reference review file was uploaded for this run. Generate varied review voices directly from the product context instead of leaning on any outside examples.\n",
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
                hasPersonas
                  ? "- Generate exactly one review for each persona above, in the same order. The output personaSlug must match that persona."
                  : "- No persona records were supplied, so use one direct-generated placeholder voice per review.",
                hasPersonas
                  ? "- Make the review sound like that woman's job, routine, budget, product preference, skin type, personality, and writing habit."
                  : "- Vary each direct-generated voice as much as possible.",
                hasPersonas
                  ? "- Follow each persona's Review length target exactly. This target was randomly assigned when the persona was selected."
                  : "- Use a realistic random mix of short, medium, and longer reviews.",
                hasPersonas
                  ? "- Use each persona's full name as displayName exactly as supplied."
                  : "- Every display name must be a full human name.",
                normalizedRequiredRatings.length > 0
                  ? `- Use these exact star ratings in this exact review order: ${normalizedRequiredRatings.join(", ")}.`
                  : "- Choose realistic ratings naturally.",
                normalizedRequiredRatings.length > 0
                  ? "- Match the emotional tone and detail level to each requested rating so the content feels believable for that score."
                  : "- Match the emotional tone and detail level to the rating you choose.",
                hasReferenceReviews
                  ? "- Match the uploaded reference file closely in tone, sentence length, title/body pattern, punctuation feel, and rating balance without copying wording."
                  : "- No reference file is being used, so create your own mix of varied, natural-sounding customer styles from scratch.",
                hasReferenceReviews
                  ? "- Treat the uploaded reference set as the style source. For each new review, stay close to one of those examples in feel and structure, then rewrite it into a fresh original review."
                  : "- Build each review from the product context rather than trying to imitate any outside sample.",
                "- Without a reference file, skew naturally positive with mostly 4-5 star reviews and an occasional 3-star review.",
                "- The title should look like a real review heading, not a marketing headline.",
                "- The body should read like a customer comment, not like a blog post or ad.",
                "- No markdown, no bullet points, no emojis, no hashtags, no all-caps titles.",
                "- Every display name must be a full human name like 'Olivia Parker' or 'Emma Brooks'. No initials such as 'Emma R.' or single names."
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
    .map((row, index) => {
      const normalized = normalizeGeneratedDraft(row, index, personas);
      if (!normalized) {
        return null;
      }

      const forcedRating = normalizedRequiredRatings[index];
      return forcedRating ? { ...normalized, rating: forcedRating } : normalized;
    })
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
  const requiredRatings = Array.isArray(input.requiredRatings)
    ? input.requiredRatings
        .map((rating) => Math.max(1, Math.min(5, Math.round(rating))))
        .slice(0, totalQuantity)
    : [];

  for (let offset = 0; offset < totalQuantity; offset += batchSize) {
    const currentBatchSize = Math.min(batchSize, totalQuantity - offset);
    const batchInput = {
      ...input,
      personas: input.personas?.slice(offset, offset + currentBatchSize)
    };
    const batchDrafts = await generateAiReviewBatch(
      batchInput,
      currentBatchSize,
      drafts,
      requiredRatings.slice(offset, offset + currentBatchSize)
    );
    drafts.push(...batchDrafts);
  }

  return drafts;
}
