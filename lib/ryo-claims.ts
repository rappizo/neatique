import { sendCustomerWelcomeEmail } from "@/lib/email";
import { RYO_REWARD_POINTS } from "@/lib/mascot-program";
import { ensureCustomerRewardAccountTx } from "@/lib/reward-accounts";
import { prisma } from "@/lib/db";

type RyoCompletionData = {
  purchasedProduct?: string | null;
  reviewRating?: number | null;
  commentText?: string | null;
  reviewDestinationUrl?: string | null;
  screenshotName?: string | null;
  screenshotMimeType?: string | null;
  screenshotBase64?: string | null;
  screenshotBytes?: number | null;
};

type CompleteRyoClaimResult =
  | {
      status: "missing";
    }
  | {
      status: "already-complete";
      platformKey: string;
      claimId: string;
    }
  | {
      status: "duplicate-order";
      platformKey: string;
    }
  | {
      status: "completed";
      claimId: string;
      platformKey: string;
    };

export async function completeRyoClaimWithPoints(input: {
  claimId: string;
  completionData?: RyoCompletionData;
}): Promise<CompleteRyoClaimResult> {
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.ryoClaim.findUnique({
      where: { id: input.claimId }
    });

    if (!claim) {
      return { status: "missing" as const };
    }

    if (claim.completedAt || claim.rewardGranted) {
      return {
        status: "already-complete" as const,
        platformKey: claim.platformKey,
        claimId: claim.id
      };
    }

    const existingOrderClaim = await tx.ryoClaim.findFirst({
      where: {
        id: {
          not: claim.id
        },
        completedAt: {
          not: null
        },
        orderId: claim.orderId
      },
      select: { id: true }
    });

    if (existingOrderClaim) {
      return {
        status: "duplicate-order" as const,
        platformKey: claim.platformKey
      };
    }

    const { customer, tempPassword } = await ensureCustomerRewardAccountTx(tx, {
      email: claim.email,
      name: claim.name
    });
    const completedAt = new Date();

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: {
          increment: claim.pointsAwarded || RYO_REWARD_POINTS
        }
      }
    });

    await tx.rewardEntry.create({
      data: {
        customerId: customer.id,
        type: "EARNED",
        points: claim.pointsAwarded || RYO_REWARD_POINTS,
        note: `RYO registration ${claim.orderId}`
      }
    });

    const updatedClaim = await tx.ryoClaim.update({
      where: { id: claim.id },
      data: {
        ...input.completionData,
        customerId: customer.id,
        completedAt,
        rewardGranted: true,
        rewardGrantedAt: completedAt
      }
    });

    return {
      status: "completed" as const,
      claimId: updatedClaim.id,
      platformKey: updatedClaim.platformKey,
      tempPassword,
      customerEmail: customer.email,
      firstName: customer.firstName
    };
  });

  if (result.status === "completed" && result.tempPassword) {
    await sendCustomerWelcomeEmail({
      email: result.customerEmail,
      firstName: result.firstName,
      password: result.tempPassword
    }).catch((error) => {
      console.error("RYO welcome email delivery failed:", error);
    });
  }

  return result;
}
