import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "neatique-customer-session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildCookieExpiry() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function makeReviewDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const firstName = input.firstName?.trim();
  const lastInitial = input.lastName?.trim()?.[0];

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  if (input.email) {
    return input.email.split("@")[0];
  }

  return "Verified customer";
}

export async function createCustomerSession(customerId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildCookieExpiry();

  await prisma.customerSession.create({
    data: {
      customerId,
      tokenHash,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.customerSession.deleteMany({
      where: {
        tokenHash: hashSessionToken(token)
      }
    });
  }

  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    expires: new Date(0),
    path: "/"
  });
}

export async function getCurrentCustomerId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.customerSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token)
    },
    include: {
      customer: true
    }
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.customerId;
}

export async function getCurrentCustomer() {
  const customerId = await getCurrentCustomerId();

  if (!customerId) {
    return null;
  }

  return prisma.customer.findUnique({
    where: { id: customerId }
  });
}

export async function requireCustomerSession() {
  const customerId = await getCurrentCustomerId();

  if (!customerId) {
    redirect("/account/login");
  }

  return customerId;
}
