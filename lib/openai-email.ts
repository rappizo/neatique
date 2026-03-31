import { siteConfig } from "@/lib/site-config";
import type { EmailAudienceType } from "@/lib/types";

const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
const DEFAULT_OPENAI_EMAIL_MODEL = process.env.OPENAI_EMAIL_MODEL || "gpt-5.4-mini";

type EmailProductContext = {
  name: string;
  slug: string;
  tagline: string;
  shortDescription: string;
  priceCents: number;
  compareAtPriceCents: number | null;
};

type GenerateEmailCampaignDraftInput = {
  campaignName: string;
  audienceType: EmailAudienceType;
  strategyBrief: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  products: EmailProductContext[];
};

type GeneratedEmailCampaignDraft = {
  subject: string;
  previewText: string;
  contentHtml: string;
  contentText: string;
};

function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

export function getOpenAiEmailSettings() {
  const apiKey = getOpenAiApiKey();

  return {
    ready: Boolean(apiKey),
    model: DEFAULT_OPENAI_EMAIL_MODEL,
    apiKeyConfigured: Boolean(apiKey)
  };
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function buildProductCatalogSummary(products: EmailProductContext[]) {
  if (products.length === 0) {
    return "No active products were available from the catalog.";
  }

  return products
    .map((product) => {
      const compareAt =
        typeof product.compareAtPriceCents === "number" && product.compareAtPriceCents > product.priceCents
          ? ` (compare at ${formatCurrency(product.compareAtPriceCents)})`
          : "";

      return [
        `- ${product.name}`,
        `  URL: ${siteConfig.url}/shop/${product.slug}`,
        `  Tagline: ${product.tagline}`,
        `  Description: ${product.shortDescription}`,
        `  Price: ${formatCurrency(product.priceCents)}${compareAt}`
      ].join("\n");
    })
    .join("\n");
}

function buildAudienceHint(audienceType: EmailAudienceType) {
  switch (audienceType) {
    case "NEWSLETTER":
      return "newsletter subscribers who have already shown interest in the brand";
    case "CUSTOMERS":
      return "existing opted-in customers who have already purchased or created an account";
    case "LEADS":
      return "contact leads who reached out and may still need confidence before buying";
    case "ALL_MARKETING":
      return "a mixed marketing audience that includes subscribers, customers, and leads";
    case "CUSTOM":
      return "a custom audience selected by the team";
    default:
      return "a skincare audience";
  }
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

export async function generateEmailCampaignDraftWithAi(
  input: GenerateEmailCampaignDraftInput
): Promise<GeneratedEmailCampaignDraft> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const productCatalogSummary = buildProductCatalogSummary(input.products);
  const audienceHint = buildAudienceHint(input.audienceType);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      subject: {
        type: "string",
        minLength: 8,
        maxLength: 110
      },
      previewText: {
        type: "string",
        minLength: 12,
        maxLength: 160
      },
      contentHtml: {
        type: "string",
        minLength: 120
      },
      contentText: {
        type: "string",
        minLength: 60
      }
    },
    required: ["subject", "previewText", "contentHtml", "contentText"]
  };

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_EMAIL_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are Neatique's senior lifecycle email strategist and copywriter.",
                "Write clean, conversion-focused skincare marketing emails for women in the United States.",
                "Keep the tone polished, warm, modern, and premium without sounding clinical or exaggerated.",
                "Do not use medical claims, cure language, guaranteed outcomes, or before/after framing.",
                "Avoid overpromising and keep product language cosmetic-friendly and compliant.",
                "Return only valid JSON that matches the provided schema."
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
                `Brand: ${siteConfig.name} (${siteConfig.url})`,
                `Campaign name: ${input.campaignName}`,
                `Audience: ${input.audienceType} (${audienceHint})`,
                `Strategy brief: ${input.strategyBrief}`,
                `Sender name: ${input.senderName || siteConfig.name}`,
                `Sender email: ${input.senderEmail || siteConfig.supportEmail}`,
                `Reply-to: ${input.replyTo || siteConfig.supportEmail}`,
                "Create a launch-ready promotional email with one clear hero angle, 2-3 product callouts, and one primary CTA.",
                "Use product URLs from the catalog context exactly as provided when linking products.",
                "The HTML should be email-friendly: one centered column, inline styles, accessible button styling, short sections, and no JavaScript.",
                "The plain-text version should mirror the same message structure.",
                "Product catalog context:",
                productCatalogSummary
              ].join("\n\n")
            }
          ]
        }
      ],
      reasoning: {
        effort: "low"
      },
      text: {
        format: {
          type: "json_schema",
          name: "email_campaign_draft",
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
    throw new Error("OpenAI did not return campaign content.");
  }

  const output = safeJsonParse(outputText);
  const normalizedOutput =
    output && typeof output === "object" ? (output as Record<string, unknown>) : null;

  if (
    !normalizedOutput ||
    typeof normalizedOutput.subject !== "string" ||
    typeof normalizedOutput.previewText !== "string" ||
    typeof normalizedOutput.contentHtml !== "string" ||
    typeof normalizedOutput.contentText !== "string"
  ) {
    throw new Error("OpenAI returned an invalid campaign draft.");
  }

  return {
    subject: normalizedOutput.subject.trim(),
    previewText: normalizedOutput.previewText.trim(),
    contentHtml: normalizedOutput.contentHtml.trim(),
    contentText: normalizedOutput.contentText.trim()
  };
}

function extractOpenAiErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
