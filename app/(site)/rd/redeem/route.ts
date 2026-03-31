import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCustomerId } from "@/lib/customer-auth";
import { buildCheckoutAddress, validateCheckoutAddress } from "@/lib/us-address";

export const runtime = "nodejs";

function redirectToRedeem(request: Request, mascotSlug?: string, error?: string, status?: string) {
  const url = new URL("/rd", request.url);

  if (mascotSlug) {
    url.searchParams.set("mascot", mascotSlug);
  }

  if (error) {
    url.searchParams.set("error", error);
  }

  if (status) {
    url.searchParams.set("status", status);
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const customerId = await getCurrentCustomerId();

  if (!customerId) {
    return redirectToRedeem(request, undefined, "auth");
  }

  const formData = await request.formData();
  const mascotSlug = String(formData.get("mascotSlug") || "").trim();

  if (!mascotSlug) {
    return redirectToRedeem(request, undefined, "mascot");
  }

  const shippingAddress = buildCheckoutAddress({
    fullName: formData.get("fullName"),
    address1: formData.get("address1"),
    address2: formData.get("address2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode")
  });
  const addressValidation = validateCheckoutAddress(shippingAddress);

  if (addressValidation) {
    return redirectToRedeem(
      request,
      mascotSlug,
      addressValidation === "missing" ? "address" : addressValidation
    );
  }

  try {
    const redemption = await prisma.$transaction(async (tx) => {
      const [customer, mascot] = await Promise.all([
        tx.customer.findUnique({
          where: { id: customerId }
        }),
        tx.mascotReward.findFirst({
          where: {
            slug: mascotSlug,
            active: true
          }
        })
      ]);

      if (!customer || !mascot) {
        throw new Error(customer ? "mascot" : "auth");
      }

      if (customer.loyaltyPoints < mascot.pointsCost) {
        throw new Error("points");
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          loyaltyPoints: {
            decrement: mascot.pointsCost
          }
        }
      });

      await tx.rewardEntry.create({
        data: {
          customerId: customer.id,
          type: "REDEEMED",
          points: -mascot.pointsCost,
          note: `Mascot redemption ${mascot.sku} ${mascot.name}`
        }
      });

      return tx.mascotRedemption.create({
        data: {
          pointsSpent: mascot.pointsCost,
          status: "REQUESTED",
          email: customer.email,
          fullName: shippingAddress.fullName,
          address1: shippingAddress.address1,
          address2: shippingAddress.address2 || null,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          customerId: customer.id,
          mascotId: mascot.id
        },
        include: {
          mascot: true
        }
      });
    });

    const successUrl = new URL("/rd/success", request.url);
    successUrl.searchParams.set("mascot", redemption.mascot.slug);
    revalidatePath("/account");
    revalidatePath("/rd");
    revalidatePath("/admin/rewards");
    return NextResponse.redirect(successUrl, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "points";
    return redirectToRedeem(request, mascotSlug, message);
  }
}
