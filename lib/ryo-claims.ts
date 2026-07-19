import { sendRyoRewardApprovedEmail } from "@/lib/email";
import { createGuestRewardEventTx } from "@/lib/guest-rewards";
import { RYO_REWARD_POINTS } from "@/lib/mascot-program";
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

type RewardDestination = {
  customerId: string | null;
  guestSessionId: string | null;
};

type CompleteRyoClaimResult =
  | { status: "missing" }
  | ({
      status: "already-complete";
      platformKey: string;
      claimId: string;
    } & RewardDestination)
  | { status: "duplicate-order"; platformKey: string }
  | ({
      status: "completed";
      claimId: string;
      platformKey: string;
      pointsAwarded: number;
      customerEmail: string;
      firstName: string | null;
    } & RewardDestination);

type ApproveRyoClaimResult =
  | { status: "missing" }
  | { status: "not-ready" }
  | { status: "already-approved"; claimId: string }
  | ({
      status: "approved";
      claimId: string;
      pointsAwarded: number;
      customerEmail: string;
      firstName: string | null;
    } & RewardDestination);

function firstNameFromClaim(claim: RyoClaim) {
  return claim.name.trim().split(/\s+/)[0] || null;
}

async function grantRyoClaimRewardTx(
  tx: Prisma.TransactionClient,
  claim: RyoClaim,
  adminNote?: string | null
): Promise<ApproveRyoClaimResult> {
  if (!claim.completedAt || (!claim.customerId && !claim.guestSessionId)) {
    return { status: "not-ready" };
  }

  if (claim.rewardGranted) {
    if (adminNote !== undefined) {
      await tx.ryoClaim.update({
        where: { id: claim.id },
        data: { adminNote: adminNote ?? null }
      });
    }

    return { status: "already-approved", claimId: claim.id };
  }

  const approvedAt = new Date();
  const pointsAwarded = claim.pointsAwarded || RYO_REWARD_POINTS;
  const marked = await tx.ryoClaim.updateMany({
    where: {
      id: claim.id,
      rewardGranted: false
    },
    data: {
      rewardGranted: true,
      rewardGrantedAt: approvedAt,
      adminNote: adminNote ?? claim.adminNote ?? null
    }
  });

  if (marked.count === 0) {
    return { status: "already-approved", claimId: claim.id };
  }

  let customerEmail = claim.email;
  let firstName = firstNameFromClaim(claim);

  if (claim.customerId) {
    const customer = await tx.customer.findUnique({
      where: { id: claim.customerId },
      select: { email: true, firstName: true }
    });

    if (!customer) {
      throw new Error("RYO reward customer no longer exists.");
    }

    await tx.customer.update({
      where: { id: claim.customerId },
      data: {
        loyaltyPoints: { increment: pointsAwarded }
      }
    });
    await tx.rewardEntry.create({
      data: {
        customerId: claim.customerId,
        type: "EARNED",
        points: pointsAwarded,
        note: `RYO registration completed ${claim.orderId}`
      }
    });
    customerEmail = customer.email;
    firstName = customer.firstName;
  } else if (claim.guestSessionId) {
    await createGuestRewardEventTx(tx, {
      guestSessionId: claim.guestSessionId,
      source: "RYO",
      sourceId: claim.id,
      points: pointsAwarded,
      note: `RYO registration completed ${claim.orderId}`
    });
  }

  return {
    status: "approved",
    claimId: claim.id,
    customerId: claim.customerId,
    guestSessionId: claim.guestSessionId,
    pointsAwarded,
    customerEmail,
    firstName
  };
}

async function sendRyoRewardEmail(result: {
  pointsAwarded: number;
  customerEmail: string;
  firstName: string | null;
}) {
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
    const claim = await tx.ryoClaim.findUnique({ where: { id: input.claimId } });

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
            guestSessionId: rewardResult.guestSessionId,
            pointsAwarded: rewardResult.pointsAwarded,
            customerEmail: rewardResult.customerEmail,
            firstName: rewardResult.firstName
          };
        }
      }

      return {
        status: "already-complete" as const,
        platformKey: claim.platformKey,
        claimId: claim.id,
        customerId: claim.customerId,
        guestSessionId: claim.guestSessionId
      };
    }

    const existingOrderClaim = await tx.ryoClaim.findFirst({
      where: {
        id: { not: claim.id },
        completedAt: { not: null },
        orderId: claim.orderId
      },
      select: { id: true }
    });

    if (existingOrderClaim) {
      return { status: "duplicate-order" as const, platformKey: claim.platformKey };
    }

    const updatedClaim = await tx.ryoClaim.update({
      where: { id: claim.id },
      data: {
        ...input.completionData,
        completedAt: new Date()
      }
    });
    const rewardResult = await grantRyoClaimRewardTx(tx, updatedClaim);

    if (rewardResult.status !== "approved") {
      return {
        status: "already-complete" as const,
        claimId: updatedClaim.id,
        platformKey: updatedClaim.platformKey,
        customerId: updatedClaim.customerId,
        guestSessionId: updatedClaim.guestSessionId
      };
    }

    return {
      status: "completed" as const,
      claimId: updatedClaim.id,
      platformKey: updatedClaim.platformKey,
      customerId: rewardResult.customerId,
      guestSessionId: rewardResult.guestSessionId,
      pointsAwarded: rewardResult.pointsAwarded,
      customerEmail: rewardResult.customerEmail,
      firstName: rewardResult.firstName
    };
  });

  if (result.status === "completed") {
    await sendRyoRewardEmail(result);
  }

  return result;
}

export async function approveRyoClaimReward(input: {
  claimId: string;
  adminNote?: string | null;
}): Promise<ApproveRyoClaimResult> {
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.ryoClaim.findUnique({ where: { id: input.claimId } });

    if (!claim) {
      return { status: "missing" as const };
    }

    return grantRyoClaimRewardTx(tx, claim, input.adminNote);
  });

  if (result.status === "approved") {
    await sendRyoRewardEmail(result);
  }

  return result;
}
