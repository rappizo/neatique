"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearCustomerSession, createCustomerSession, makeReviewDisplayName, requireCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { sendCustomerPasswordResetEmail } from "@/lib/email";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import { hashPassword, verifyPassword } from "@/lib/password";
import { consumeSecurityRateLimit, getSecurityIdentifiers } from "@/lib/security-rate-limit";
import { toBool, toInt, toPlainString } from "@/lib/utils";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_RESET_DURATION_MS = 30 * 60 * 1000;

function isValidCustomerPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function checkAccountRateLimit(input: {
  scope: string;
  subject?: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}) {
  const requestHeaders = await headers();
  return consumeSecurityRateLimit({
    ...input,
    identifiers: getSecurityIdentifiers(requestHeaders, input.subject)
  });
}

export async function registerCustomerAction(formData: FormData) {
  const email = toPlainString(formData.get("email")).toLowerCase();
  const password = toPlainString(formData.get("password"));
  const firstName = toPlainString(formData.get("firstName")) || null;
  const lastName = toPlainString(formData.get("lastName")) || null;
  const marketingOptIn = toBool(formData.get("marketingOptIn"));

  if (!email || !password) {
    redirect("/account/register?error=missing");
  }

  if (!emailPattern.test(email)) {
    redirect("/account/register?error=email");
  }

  if (!isValidCustomerPassword(password)) {
    redirect("/account/register?error=password");
  }

  const rateLimit = await checkAccountRateLimit({
    scope: "customer-register",
    subject: email,
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect("/account/register?error=rate");
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: { email }
  });

  if (existingCustomer?.passwordHash) {
    redirect("/account/login?error=exists");
  }

  const passwordHash = hashPassword(password);
  const customer = existingCustomer
    ? await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          firstName,
          lastName,
          marketingOptIn,
          passwordHash,
          passwordSetAt: new Date(),
          lastLoginAt: new Date()
        }
      })
    : await prisma.customer.create({
        data: {
          email,
          firstName,
          lastName,
          marketingOptIn,
          passwordHash,
          passwordSetAt: new Date(),
          lastLoginAt: new Date()
        }
      });

  if (marketingOptIn) {
    try {
      await syncEmailMarketingContact({
        email,
        audienceType: "CUSTOMERS",
        firstName,
        lastName,
        source: "CUSTOMER_ACCOUNT"
      });
    } catch (error) {
      console.error("Brevo customer sync failed:", error);
    }
  }

  await createCustomerSession(customer.id);
  revalidatePath("/account");
  redirect("/account");
}

export async function loginCustomerAction(formData: FormData) {
  const email = toPlainString(formData.get("email")).toLowerCase();
  const password = toPlainString(formData.get("password"));

  const rateLimit = await checkAccountRateLimit({
    scope: "customer-login",
    subject: email,
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect("/account/login?error=rate");
  }

  const customer = emailPattern.test(email) && password.length > 0 && password.length <= PASSWORD_MAX_LENGTH
    ? await prisma.customer.findUnique({
    where: { email }
      })
    : null;

  if (!customer?.passwordHash || !verifyPassword(password, customer.passwordHash)) {
    redirect("/account/login?error=invalid");
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      lastLoginAt: new Date()
    }
  });

  await createCustomerSession(customer.id);
  redirect("/account");
}

export async function requestCustomerPasswordResetAction(formData: FormData) {
  const email = toPlainString(formData.get("email")).toLowerCase();

  if (!email) {
    redirect("/account/forgot-password?error=missing");
  }

  if (!emailPattern.test(email)) {
    redirect("/account/forgot-password?error=email");
  }

  const rateLimit = await checkAccountRateLimit({
    scope: "customer-password-reset-request",
    subject: email,
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect("/account/forgot-password?error=rate");
  }

  const customer = await prisma.customer.findUnique({
    where: { email }
  });

  if (!customer) {
    redirect("/account/login?status=reset-sent");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        customerId: customer.id,
        consumedAt: null
      },
      data: { consumedAt: new Date() }
    });

    return tx.passwordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_DURATION_MS)
      }
    });
  });

  const delivery = await sendCustomerPasswordResetEmail({
    email: customer.email,
    firstName: customer.firstName,
    token
  });

  if (!delivery.delivered) {
    console.error("Customer password reset email delivery failed:", delivery);
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => undefined);
  }

  redirect("/account/login?status=reset-sent");
}

export async function completeCustomerPasswordResetAction(formData: FormData) {
  const token = toPlainString(formData.get("token"));
  const password = toPlainString(formData.get("password"));

  if (!token || !isValidCustomerPassword(password)) {
    const query = !token ? "invalid" : "password";
    redirect(`/account/reset-password?token=${encodeURIComponent(token)}&error=${query}`);
  }

  const rateLimit = await checkAccountRateLimit({
    scope: "customer-password-reset-complete",
    subject: hashResetToken(token),
    maxAttempts: 8,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    redirect(`/account/reset-password?token=${encodeURIComponent(token)}&error=rate`);
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) }
  });

  if (!resetToken || resetToken.consumedAt || resetToken.expiresAt <= new Date()) {
    redirect("/account/reset-password?error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          consumedAt: null,
          expiresAt: { gt: new Date() }
        },
        data: { consumedAt: new Date() }
      });

      if (consumed.count !== 1) {
        throw new Error("RESET_TOKEN_INVALID");
      }

      await tx.customer.update({
        where: { id: resetToken.customerId },
        data: {
          passwordHash: hashPassword(password),
          passwordSetAt: new Date()
        }
      });

      await tx.customerSession.deleteMany({
        where: { customerId: resetToken.customerId }
      });

      await tx.passwordResetToken.updateMany({
        where: {
          customerId: resetToken.customerId,
          consumedAt: null
        },
        data: { consumedAt: new Date() }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_TOKEN_INVALID") {
      redirect("/account/reset-password?error=invalid");
    }
    throw error;
  }

  redirect("/account/login?status=reset-complete");
}

export async function logoutCustomerAction() {
  await clearCustomerSession();
  redirect("/");
}

export async function updateCustomerPasswordAction(formData: FormData) {
  const customerId = await requireCustomerSession();
  const currentPassword = toPlainString(formData.get("currentPassword"));
  const newPassword = toPlainString(formData.get("newPassword"));

  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    redirect("/account/login");
  }

  if (customer.passwordHash && !verifyPassword(currentPassword, customer.passwordHash)) {
    redirect("/account?error=password");
  }

  if (!isValidCustomerPassword(newPassword)) {
    redirect("/account?error=password-format");
  }

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        passwordHash: hashPassword(newPassword),
        passwordSetAt: new Date()
      }
    }),
    prisma.customerSession.deleteMany({
      where: { customerId }
    }),
    prisma.passwordResetToken.updateMany({
      where: { customerId, consumedAt: null },
      data: { consumedAt: new Date() }
    })
  ]);

  await createCustomerSession(customerId);

  revalidatePath("/account");
  redirect("/account?status=password-updated");
}

export async function submitProductReviewAction(formData: FormData) {
  const customerId = await requireCustomerSession();
  const productId = toPlainString(formData.get("productId"));
  const productSlug = toPlainString(formData.get("productSlug"));
  const rating = Math.max(1, Math.min(5, toInt(formData.get("rating"), 5)));
  const title = toPlainString(formData.get("title"));
  const content = toPlainString(formData.get("content"));

  const [customer, purchase] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId }
    }),
    prisma.order.findFirst({
      where: {
        customerId,
        status: {
          in: ["PAID", "FULFILLED"]
        },
        items: {
          some: {
            productId
          }
        }
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  if (!customer || !purchase) {
    redirect(`/shop/${productSlug}?error=review-not-eligible#reviews`);
  }

  const existingReview = await prisma.productReview.findFirst({
    where: {
      customerId,
      productId
    }
  });

  const payload = {
    rating,
    title,
    content,
    displayName: makeReviewDisplayName(customer),
    reviewDate: new Date(),
    status: "PENDING" as const,
    verifiedPurchase: true,
    orderId: purchase.id,
    productId,
    customerId
  };

  if (existingReview) {
    await prisma.productReview.update({
      where: { id: existingReview.id },
      data: payload
    });
  } else {
    await prisma.productReview.create({
      data: payload
    });
  }

  revalidatePath(`/shop/${productSlug}`);
  revalidatePath("/account");
  revalidatePath("/admin/reviews");
  redirect(`/shop/${productSlug}?review=submitted#reviews`);
}
