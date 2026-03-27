import Stripe from "stripe";

function hasUsableStripeSecretKey(key: string | undefined) {
  const normalizedKey = (key || "").trim();
  return Boolean(normalizedKey && normalizedKey.startsWith("sk_") && !normalizedKey.includes("your_key"));
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

export const stripe =
  stripeSecretKey && hasUsableStripeSecretKey(stripeSecretKey) ? new Stripe(stripeSecretKey) : null;

function normalizeBaseUrl(value: string | undefined) {
  const normalized = (value || "").trim();

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    return url.origin;
  } catch {
    return null;
  }
}

export function getBaseUrl(request?: Request) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
