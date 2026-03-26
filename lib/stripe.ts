import Stripe from "stripe";

function hasUsableStripeSecretKey(key: string | undefined) {
  return Boolean(key && key.startsWith("sk_") && !key.includes("your_key"));
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe =
  stripeSecretKey && hasUsableStripeSecretKey(stripeSecretKey) ? new Stripe(stripeSecretKey) : null;

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}
