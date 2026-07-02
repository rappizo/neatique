import { sendCustomerWelcomeEmail, sendRyoRewardApprovedEmail } from "@/lib/email";
import { RYO_REWARD_POINTS } from "@/lib/mascot-program";
import { ensureCustomerRewardAccountTx } from "@/lib/reward-accounts";
import { prisma } from "@/lib/db";
import type { Prisma, RyoClaim } from "@prisma/client";

type RyoCompletionData = {
  purchasedProduct?: string | null;
  reviewRating?: number | null;
  commentText?: string | null;
  reviewDestinationUrl?: string | null;
  reviewStepSubmittedAt?: Date | null;
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
      customerId: string | null;
    }
  | {
      status: "duplicate-order";
      platformKey: string;
    }
  | {
      status: "completed";
      claimId: string;
      platformKey: string;
      customerId: string;
      pointsAwarded: number;
      customerEmail: string;
      firstName: string | null;
      tempPassword: string | null;
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
      customerId: string;
      pointsAwarded: number;
      customerEmail: string;
      firstName: string | null;
      tempPassword: string | null;
    };

async function grantRyoClaimRewardTx(
  tx: Prisma.TransactionClient,
  claim: RyoClaim,
  adminNote?: string | null
): Promise<ApproveRyoClaimResult> {
  if (!claim.completedAt) {
    return { status: "not-ready" as const };
  }

  if (claim.rewardGranted) {
    if (adminNote !== undefined) {
      await tx.ryoClaim.update({
        where: { id: claim.id },
        data: {
          adminNote: adminNote ?? null
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
  const marked = await tx.ryoClaim.updateMany({
    where: {
      id: claim.id,
      rewardGranted: false
    },
    data: {
      customerId: customer.id,
      rewardGranted: true,
      rewardGrantedAt: approvedAt,
      adminNote: adminNote ?? claim.adminNote ?? null
    }
  });

  if (marked.count === 0) {
    return {
      status: "already-approved" as const,
      claimId: claim.id
    };
  }

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
      note: `RYO registration completed ${claim.orderId}`
    }
  });

  return {
    status: "approved" as const,
    claimId: claim.id,
    customerId: customer.id,
    pointsAwarded,
    customerEmail: customer.email,
    firstName: customer.firstName,
    tempPassword
  };
}

type RyoRewardEmailInput = {
  pointsAwarded: number;
  customerEmail: string;
  firstName: string | null;
  tempPassword: string | null;
};

async function sendRyoRewardEmails(result: RyoRewardEmailInput) {
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
    console.error("RYO completion email delivery failed:", error);
  });
}

export async function completeRyoClaimSubmission(input: {
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

    if (claim.completedAt) {
      if (!claim.rewardGranted) {
        const rewardResult = await grantRyoClaimRewardTx(tx, claim);

        if (rewardResult.status === "approved") {
          return {
            status: "completed" as const,
            claimId: claim.id,
            platformKey: claim.platformKey,
            customerId: rewardResult.customerId,
            pointsAwarded: rewardResult.pointsAwarded,
            customerEmail: rewardResult.customerEmail,
            firstName: rewardResult.firstName,
            tempPassword: rewardResult.tempPassword
          };
        }
      }

      return {
        status: "already-complete" as const,
        platformKey: claim.platformKey,
        claimId: claim.id,
        customerId: claim.customerId
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

    const completedAt = new Date();
    const updatedClaim = await tx.ryoClaim.update({
      where: { id: claim.id },
      data: {
        ...input.completionData,
        completedAt
      }
    });
    const rewardResult = await grantRyoClaimRewardTx(tx, {
      ...updatedClaim,
      completedAt
    });

    if (rewardResult.status !== "approved") {
      return {
        status: "already-complete" as const,
        claimId: updatedClaim.id,
        platformKey: updatedClaim.platformKey,
        customerId: updatedClaim.customerId
      };
    }

    return {
      status: "completed" as const,
      claimId: updatedClaim.id,
      platformKey: updatedClaim.platformKey,
      customerId: rewardResult.customerId,
      pointsAwarded: rewardResult.pointsAwarded,
      customerEmail: rewardResult.customerEmail,
      firstName: rewardResult.firstName,
      tempPassword: rewardResult.tempPassword
    };
  });

  if (result.status === "completed") {
    await sendRyoRewardEmails(result);
  }

  return result;
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

    return grantRyoClaimRewardTx(tx, claim, input.adminNote);
  });

  if (result.status === "approved") {
    await sendRyoRewardEmails(result);
  }

  return result;
}
