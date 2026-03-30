"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearCustomerSession, createCustomerSession, makeReviewDisplayName, requireCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import { hashPassword, verifyPassword } from "@/lib/password";
import { toBool, toInt, toPlainString } from "@/lib/utils";

export async function registerCustomerAction(formData: FormData) {
  const email = toPlainString(formData.get("email")).toLowerCase();
  const password = toPlainString(formData.get("password"));
  const firstName = toPlainString(formData.get("firstName")) || null;
  const lastName = toPlainString(formData.get("lastName")) || null;
  const marketingOptIn = toBool(formData.get("marketingOptIn"));

  if (!email || !password) {
    redirect("/account/register?error=missing");
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
        audienceType: "CUSTOMERS"
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

  const customer = await prisma.customer.findUnique({
    where: { email }
  });

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

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      passwordHash: hashPassword(newPassword),
      passwordSetAt: new Date()
    }
  });

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
