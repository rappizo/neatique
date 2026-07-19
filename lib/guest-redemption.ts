import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createEmailVerificationCode,
  EMAIL_VERIFICATION_DURATION_MS,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_RESEND_MS,
  hashEmailVerificationCode,
  REDEMPTION_DRAFT_DURATION_MS,
  transferGuestRewardsTx,
  verifyEmailVerificationCode
} from "@/lib/guest-rewards";

const EMAIL_VERIFICATION_WINDOW_MS = 1000 * 60 * 15;
const EMAIL_VERIFICATION_MAX_SENDS_PER_WINDOW = 5;

export type RedemptionAddress = {
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function splitFullName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return {
    firstName: firstName || null,
    lastName: rest.join(" ") || null
  };
}

export async function getOwnedGuestRedemptionDraft(input: {
  draftId: string;
  guestSessionId: string;
}) {
  return prisma.guestRedemptionDraft.findFirst({
    where: {
      id: input.draftId,
      guestSessionId: input.guestSessionId
    },
    include: {
      mascot: true,
      verifications: {
        where: { consumedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
}

async function emailSendRateLimited(email: string, guestSessionId: string) {
  const count = await prisma.emailVerification.count({
    where: {
      purpose: "MASCOT_REDEMPTION",
      OR: [
        { email },
        {
          draft: {
            guestSessionId
          }
        }
      ],
      createdAt: {
        gt: new Date(Date.now() - EMAIL_VERIFICATION_WINDOW_MS)
      }
    }
  });

  return count >= EMAIL_VERIFICATION_MAX_SENDS_PER_WINDOW;
}

export async function createGuestRedemptionDraft(input: {
  guestSessionId: string;
  mascotId: string;
  email: string;
  address: RedemptionAddress;
}) {
  const email = input.email.trim().toLowerCase();

  if (await emailSendRateLimited(email, input.guestSessionId)) {
    return { status: "rate-limited" as const };
  }

  const code = createEmailVerificationCode();
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + REDEMPTION_DRAFT_DURATION_MS);
  const verificationExpiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_DURATION_MS);

  const draft = await prisma.$transaction(async (tx) => {
    await tx.guestRedemptionDraft.updateMany({
      where: {
        guestSessionId: input.guestSessionId,
        status: "PENDING_VERIFICATION"
      },
      data: {
        status: "CANCELLED"
      }
    });

    const created = await tx.guestRedemptionDraft.create({
      data: {
        guestSessionId: input.guestSessionId,
        mascotId: input.mascotId,
        email,
        fullName: input.address.fullName,
        address1: input.address.address1,
        address2: input.address.address2 || null,
        city: input.address.city,
        state: input.address.state,
        postalCode: input.address.postalCode,
        country: input.address.country,
        reservedUntil
      }
    });

    await tx.emailVerification.create({
      data: {
        purpose: "MASCOT_REDEMPTION",
        email,
        draftId: created.id,
        tokenHash: hashEmailVerificationCode({ draftId: created.id, email, code }),
        expiresAt: verificationExpiresAt
      }
    });

    return created;
  });

  return {
    status: "created" as const,
    draft,
    code
  };
}

export async function resendGuestRedemptionCode(input: {
  draftId: string;
  guestSessionId: string;
}) {
  const draft = await getOwnedGuestRedemptionDraft(input);

  if (!draft || draft.status !== "PENDING_VERIFICATION") {
    return { status: "missing" as const };
  }

  if (draft.reservedUntil <= new Date()) {
    await prisma.guestRedemptionDraft.update({
      where: { id: draft.id },
      data: { status: "EXPIRED" }
    });
    return { status: "expired" as const };
  }

  const latest = draft.verifications[0];

  if (latest && latest.createdAt.getTime() + EMAIL_VERIFICATION_RESEND_MS > Date.now()) {
    return { status: "cooldown" as const };
  }

  if (await emailSendRateLimited(draft.email, input.guestSessionId)) {
    return { status: "rate-limited" as const };
  }

  const code = createEmailVerificationCode();
  const now = new Date();

  await prisma.$transaction([
    prisma.emailVerification.updateMany({
      where: {
        draftId: draft.id,
        consumedAt: null
      },
      data: {
        consumedAt: now
      }
    }),
    prisma.emailVerification.create({
      data: {
        purpose: "MASCOT_REDEMPTION",
        email: draft.email,
        draftId: draft.id,
        tokenHash: hashEmailVerificationCode({
          draftId: draft.id,
          email: draft.email,
          code
        }),
        expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_DURATION_MS)
      }
    })
  ]);

  return {
    status: "sent" as const,
    draft,
    code
  };
}

class InsufficientPointsError extends Error {}

export async function completeGuestRedemption(input: {
  draftId: string;
  guestSessionId: string;
  code: string;
}) {
  const code = input.code.replace(/\D/g, "").slice(0, 6);

  if (code.length !== 6) {
    return { status: "invalid-code" as const };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const draft = await tx.guestRedemptionDraft.findFirst({
        where: {
          id: input.draftId,
          guestSessionId: input.guestSessionId
        },
        include: {
          mascot: true,
          verifications: {
            where: { consumedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      if (!draft) {
        return { status: "missing" as const };
      }

      if (draft.status === "COMPLETED" && draft.completedRedemptionId) {
        const completedRedemption = await tx.mascotRedemption.findUnique({
          where: { id: draft.completedRedemptionId },
          select: { customerId: true }
        });
        return {
          status: "already-complete" as const,
          customerId: completedRedemption?.customerId ?? null,
          redemptionId: draft.completedRedemptionId,
          mascotSlug: draft.mascot.slug
        };
      }

      if (draft.status !== "PENDING_VERIFICATION" || draft.reservedUntil <= new Date()) {
        if (draft.status === "PENDING_VERIFICATION") {
          await tx.guestRedemptionDraft.update({
            where: { id: draft.id },
            data: { status: "EXPIRED" }
          });
        }
        return { status: "expired" as const };
      }

      const verification = draft.verifications[0];

      if (!verification || verification.expiresAt <= new Date()) {
        return { status: "code-expired" as const };
      }

      if (verification.attemptCount >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
        return { status: "locked" as const };
      }

      if (
        !verifyEmailVerificationCode({
          draftId: draft.id,
          email: draft.email,
          code,
          expectedHash: verification.tokenHash
        })
      ) {
        await tx.emailVerification.update({
          where: { id: verification.id },
          data: {
            attemptCount: {
              increment: 1
            }
          }
        });
        return {
          status: verification.attemptCount + 1 >= EMAIL_VERIFICATION_MAX_ATTEMPTS
            ? "locked" as const
            : "invalid-code" as const
        };
      }

      const consumed = await tx.emailVerification.updateMany({
        where: {
          id: verification.id,
          consumedAt: null,
          attemptCount: { lt: EMAIL_VERIFICATION_MAX_ATTEMPTS }
        },
        data: {
          consumedAt: new Date()
        }
      });

      if (consumed.count === 0) {
        return { status: "locked" as const };
      }

      const name = splitFullName(draft.fullName);
      let customer = await tx.customer.findUnique({
        where: { email: draft.email }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            email: draft.email,
            firstName: name.firstName,
            lastName: name.lastName,
            marketingOptIn: false
          }
        });
      } else if (!customer.firstName || !customer.lastName) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            firstName: customer.firstName || name.firstName,
            lastName: customer.lastName || name.lastName
          }
        });
      }

      await transferGuestRewardsTx(tx, {
        guestSessionId: input.guestSessionId,
        customerId: customer.id
      });

      const debited = await tx.customer.updateMany({
        where: {
          id: customer.id,
          loyaltyPoints: {
            gte: draft.mascot.pointsCost
          }
        },
        data: {
          loyaltyPoints: {
            decrement: draft.mascot.pointsCost
          }
        }
      });

      if (debited.count === 0) {
        throw new InsufficientPointsError();
      }

      await tx.rewardEntry.create({
        data: {
          customerId: customer.id,
          type: "REDEEMED",
          points: -draft.mascot.pointsCost,
          note: `Mascot redemption ${draft.mascot.sku} ${draft.mascot.name}`
        }
      });

      const redemption = await tx.mascotRedemption.create({
        data: {
          pointsSpent: draft.mascot.pointsCost,
          status: "REQUESTED",
          email: draft.email,
          fullName: draft.fullName,
          address1: draft.address1,
          address2: draft.address2,
          city: draft.city,
          state: draft.state,
          postalCode: draft.postalCode,
          country: draft.country,
          customerId: customer.id,
          mascotId: draft.mascotId
        }
      });

      await tx.guestRedemptionDraft.update({
        where: { id: draft.id },
        data: {
          status: "COMPLETED",
          completedRedemptionId: redemption.id,
          completedAt: new Date()
        }
      });

      return {
        status: "completed" as const,
        customerId: customer.id,
        redemptionId: redemption.id,
        mascotSlug: draft.mascot.slug
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  } catch (error) {
    if (error instanceof InsufficientPointsError) {
      return { status: "points" as const };
    }

    throw error;
  }
}
