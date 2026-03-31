export type OrderMatchPlatform = "amazon" | "tiktok" | "walmart";

export type OrderMatchPlatformConfig = {
  key: OrderMatchPlatform;
  label: string;
  heroTitle: string;
  description: string;
  orderIdLabel: string;
  orderIdPlaceholder: string;
  outboundButtonLabel: string;
  outboundUrl: string | null;
};

export const OMB_SCREENSHOT_MAX_BYTES = 15 * 1024 * 1024;
export const OMB_SCREENSHOT_TARGET_BYTES = 1024 * 1024;
export const OMB_MIN_COMMENT_LENGTH = 10;

export const orderMatchPlatforms: OrderMatchPlatformConfig[] = [
  {
    key: "amazon",
    label: "Amazon",
    heroTitle: "Amazon order verification",
    description:
      "Use the Amazon form when the customer order was placed through Amazon and you want to verify the order before the next step.",
    orderIdLabel: "Order ID",
    orderIdPlaceholder: "1xx-...",
    outboundButtonLabel: "Copy Text and Go To Amazon",
    outboundUrl: null
  },
  {
    key: "tiktok",
    label: "TikTok",
    heroTitle: "TikTok Shop order verification",
    description:
      "Use the TikTok form for TikTok Shop orders. The order ID must match the TikTok format before the claim can continue.",
    orderIdLabel: "Order ID",
    orderIdPlaceholder: "5xxx...",
    outboundButtonLabel: "Copy Text and Go To TikTok",
    outboundUrl: "https://www.tiktok.com/feedback/view/fe_tiktok_ecommerce_in_web/order_list/index.html"
  },
  {
    key: "walmart",
    label: "Walmart",
    heroTitle: "Walmart order verification",
    description:
      "Use the Walmart form when the order came from Walmart. The order ID must match the Walmart format before the claim can continue.",
    orderIdLabel: "Order ID",
    orderIdPlaceholder: "200...",
    outboundButtonLabel: "Copy Text and Go To Walmart",
    outboundUrl: "https://www.walmart.com/reviews/write-review"
  }
] as const;

export function getOrderMatchPlatform(platform: string | null | undefined) {
  return orderMatchPlatforms.find((item) => item.key === platform) ?? orderMatchPlatforms[0];
}

export function isOrderMatchPlatform(
  platform: string | null | undefined
): platform is OrderMatchPlatform {
  return orderMatchPlatforms.some((item) => item.key === platform);
}

export function validateOrderId(platform: OrderMatchPlatform, rawOrderId: string) {
  const orderId = rawOrderId.trim();

  switch (platform) {
    case "amazon":
      return /^1\d{2}-\d{7}-\d{7}$/.test(orderId);
    case "tiktok":
      return /^5\d{17}$/.test(orderId);
    case "walmart":
      return /^200.{12,13}$/.test(orderId);
    default:
      return false;
  }
}

export function getOrderMatchErrorMessage(
  error: string | null | undefined,
  processLabel = "OMB claim"
) {
  if (error === "missing") {
    return "Please complete Order ID, Name, and Email before continuing.";
  }

  if (error === "email") {
    return "Please enter a valid email address before continuing.";
  }

  if (error === "platform") {
    return "Please choose Amazon, TikTok, or Walmart before continuing.";
  }

  if (error === "order-id") {
    return "The order ID does not match the selected platform format. Please recheck it and try again.";
  }

  if (error === "duplicate-order") {
    return `We already have a completed ${processLabel} for this order ID. If you have any questions, please contact us.`;
  }

  if (error === "duplicate-email") {
    return `We already have a completed ${processLabel} for this email. If you have any questions, please contact us.`;
  }

  return null;
}

export function isHighRating(rating: number) {
  return rating >= 4;
}

export function getOmbStepTwoErrorMessage(error: string | null | undefined) {
  if (error === "claim") {
    return "We could not find that OMB claim. Please start again from the order verification page.";
  }

  if (error === "product") {
    return "Please choose the product you purchased before submitting the claim.";
  }

  if (error === "rating") {
    return "Please choose a review rating from 1 to 5 stars.";
  }

  if (error === "comment") {
    return `Comments must be at least ${OMB_MIN_COMMENT_LENGTH} characters long.`;
  }

  if (error === "image-required") {
    return "Please upload a screenshot of your platform comment for 4-star and 5-star claims.";
  }

  if (error === "image-size") {
    return "The screenshot is too large. Please upload an image smaller than 15MB.";
  }

  if (error === "image-type") {
    return "Please upload a JPG, PNG, WEBP, or AVIF screenshot.";
  }

  if (error === "address") {
    return "Please leave the shipping address for the extra bottle.";
  }

  return null;
}

export function getRyoStepErrorMessage(error: string | null | undefined) {
  if (error === "claim") {
    return "We could not find that RYO registration. Please start again from the order verification page.";
  }

  if (error === "product") {
    return "Please choose the product you purchased before submitting the registration.";
  }

  if (error === "rating") {
    return "Please choose a review rating from 1 to 5 stars.";
  }

  if (error === "comment") {
    return `Comments must be at least ${OMB_MIN_COMMENT_LENGTH} characters long.`;
  }

  if (error === "image-required") {
    return "Please upload a screenshot of your platform comment for 4-star and 5-star registrations.";
  }

  if (error === "image-size") {
    return "The screenshot is too large. Please upload an image smaller than 15MB.";
  }

  if (error === "image-type") {
    return "Please upload a JPG, PNG, WEBP, or AVIF screenshot.";
  }

  return null;
}
