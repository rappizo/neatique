import { sendCustomerWelcomeEmail, sendRyoRewardApprovedEmail } from "@/lib/email";
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

type ApproveRyoClaimResult =
  | {
      status: "missing";
    }
  | {
      status: "not-ready";
    }
  | {
      status: "already-approved";
      claimId: string;
    }
  | {
      status: "approved";
      claimId: string;
      pointsAwarded: number;
      customerEmail: string;
      firstName: string | null;
      tempPassword: string | null;
    };

export async function completeRyoClaimSubmission(input: {
  claimId: string;
  completionData?: RyoCompletionData;
}): Promise<CompleteRyoClaimResult> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.ryoClaim.findUnique({
      where: { id: input.claimId }
    });

    if (!claim) {
      return { status: "missing" as const };
    }

    if (claim.completedAt) {
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

    const updatedClaim = await tx.ryoClaim.update({
      where: { id: claim.id },
      data: {
        ...input.completionData,
        completedAt: new Date()
      }
    });

    return {
      status: "completed" as const,
      claimId: updatedClaim.id,
      platformKey: updatedClaim.platformKey
    };
  });
}

export async function approveRyoClaimReward(input: {
  claimId: string;
  adminNote?: string | null;
}): Promise<ApproveRyoClaimResult> {
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.ryoClaim.findUnique({
      where: { id: input.claimId }
    });

    if (!claim) {
      return { status: "missing" as const };
    }

    if (!claim.completedAt) {
      return { status: "not-ready" as const };
    }

    if (claim.rewardGranted) {
      if (input.adminNote !== undefined) {
        await tx.ryoClaim.update({
          where: { id: claim.id },
          data: {
            adminNote: input.adminNote ?? null
          }
        });
      }

      return {
        status: "already-approved" as const,
        claimId: claim.id
      };
    }

    const { customer, tempPassword } = await ensureCustomerRewardAccountTx(tx, {
      email: claim.email,
      name: claim.name
    });
    const approvedAt = new Date();
    const pointsAwarded = claim.pointsAwarded || RYO_REWARD_POINTS;

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: {
          increment: pointsAwarded
        }
      }
    });

    await tx.rewardEntry.create({
      data: {
        customerId: customer.id,
        type: "EARNED",
        points: pointsAwarded,
        note: `RYO registration approved ${claim.orderId}`
      }
    });

    await tx.ryoClaim.update({
      where: { id: claim.id },
      data: {
        customerId: customer.id,
        rewardGranted: true,
        rewardGrantedAt: approvedAt,
        adminNote: input.adminNote ?? claim.adminNote ?? null
      }
    });

    return {
      status: "approved" as const,
      claimId: claim.id,
      pointsAwarded,
      customerEmail: customer.email,
      firstName: customer.firstName,
      tempPassword
    };
  });

  if (result.status === "approved") {
    if (result.tempPassword) {
      await sendCustomerWelcomeEmail({
        email: result.customerEmail,
        firstName: result.firstName,
        password: result.tempPassword
      }).catch((error) => {
        console.error("RYO welcome email delivery failed:", error);
      });
    }

    await sendRyoRewardApprovedEmail({
      email: result.customerEmail,
      firstName: result.firstName,
      points: result.pointsAwarded
    }).catch((error) => {
      console.error("RYO approval email delivery failed:", error);
    });
  }

  return result;
}
