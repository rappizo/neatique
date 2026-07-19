import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { getCurrentCustomerId } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";

const GUEST_REWARD_COOKIE = "neatique-guest-rewards";
const GUEST_SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
export const REDEMPTION_DRAFT_DURATION_MS = 1000 * 60 * 30;
export const EMAIL_VERIFICATION_DURATION_MS = 1000 * 60 * 10;
export const EMAIL_VERIFICATION_RESEND_MS = 1000 * 60;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;

function hashGuestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getVerificationSecret() {
  const secret =
    process.env.GUEST_REWARD_VERIFICATION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "neatique-local-guest-reward-verification";
  }

  throw new Error("GUEST_REWARD_VERIFICATION_SECRET is required in production.");
}

export function createEmailVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailVerificationCode(input: {
  draftId: string;
  email: string;
  code: string;
}) {
  return createHmac("sha256", getVerificationSecret())
    .update(`${input.draftId}:${input.email.trim().toLowerCase()}:${input.code}`)
    .digest("hex");
}

export function verifyEmailVerificationCode(input: {
  draftId: string;
  email: string;
  code: string;
  expectedHash: string;
}) {
  const actualHash = hashEmailVerificationCode(input);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(input.expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(2, localPart.length - visible.length))}@${domain}`;
}

async function setGuestRewardCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: GUEST_REWARD_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearGuestRewardCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: GUEST_REWARD_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getGuestRewardSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_REWARD_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return prisma.guestRewardSession.findFirst({
    where: {
      tokenHash: hashGuestToken(token),
      status: "ACTIVE",
      expiresAt: {
        gt: new Date()
      }
    }
  });
}

export async function getOrCreateGuestRewardSession(input?: {
  emailHint?: string | null;
  nameHint?: string | null;
}) {
  const existing = await getGuestRewardSession();
  const emailHint = input?.emailHint?.trim().toLowerCase() || null;
  const nameHint = input?.nameHint?.trim() || null;

  if (existing) {
    if ((!existing.emailHint && emailHint) || (!existing.nameHint && nameHint)) {
      return prisma.guestRewardSession.update({
        where: { id: existing.id },
        data: {
          emailHint: existing.emailHint || emailHint,
          nameHint: existing.nameHint || nameHint
        }
      });
    }

    return existing;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + GUEST_SESSION_DURATION_MS);
  const session = await prisma.guestRewardSession.create({
    data: {
      tokenHash: hashGuestToken(token),
      emailHint,
      nameHint,
      expiresAt
    }
  });

  await setGuestRewardCookie(token, expiresAt);
  return session;
}

export async function getGuestRewardSummary(sessionId: string) {
  const [points, session] = await Promise.all([
    prisma.guestRewardEvent.aggregate({
      where: {
        guestSessionId: sessionId,
        status: "EARNED"
      },
      _sum: {
        points: true
      }
    }),
    prisma.guestRewardSession.findUnique({
      where: { id: sessionId },
      select: {
        emailHint: true,
        nameHint: true,
        expiresAt: true,
        status: true
      }
    })
  ]);

  return {
    points: points._sum.points ?? 0,
    emailHint: session?.emailHint ?? null,
    nameHint: session?.nameHint ?? null,
    expiresAt: session?.expiresAt ?? null,
    active: session?.status === "ACTIVE" && Boolean(session.expiresAt && session.expiresAt > new Date())
  };
}

export async function getOwnedRyoClaim(claimId: string) {
  const [customerId, guestSession] = await Promise.all([
    getCurrentCustomerId(),
    getGuestRewardSession()
  ]);
  const ownerFilters: Prisma.RyoClaimWhereInput[] = [];

  if (customerId) {
    ownerFilters.push({ customerId });
  }

  if (guestSession) {
    ownerFilters.push({ guestSessionId: guestSession.id });
  }

  if (ownerFilters.length === 0) {
    return null;
  }

  return prisma.ryoClaim.findFirst({
    where: {
      id: claimId,
      OR: ownerFilters
    }
  });
}

export async function createGuestRewardEventTx(
  tx: Prisma.TransactionClient,
  input: {
    guestSessionId: string;
    source: "RYO" | "TIKTOK_FOLLOW";
    sourceId: string;
    points: number;
    note: string;
  }
) {
  return tx.guestRewardEvent.create({
    data: {
      guestSessionId: input.guestSessionId,
      source: input.source,
      sourceId: input.sourceId,
      points: input.points,
      note: input.note,
      status: "EARNED"
    }
  });
}

export async function transferGuestRewardsTx(
  tx: Prisma.TransactionClient,
  input: {
    guestSessionId: string;
    customerId: string;
    markSessionConverted?: boolean;
  }
) {
  const now = new Date();
  const lockedSession = await tx.guestRewardSession.updateMany({
    where: {
      id: input.guestSessionId,
      status: "ACTIVE",
      expiresAt: { gt: now }
    },
    data: {
      updatedAt: now
    }
  });

  if (lockedSession.count === 0) {
    return 0;
  }

  const events = await tx.guestRewardEvent.findMany({
    where: {
      guestSessionId: input.guestSessionId,
      status: "EARNED"
    },
    orderBy: { createdAt: "asc" }
  });
  let transferredPoints = 0;

  for (const event of events) {
    let shouldTransfer = true;

    if (event.source === "TIKTOK_FOLLOW") {
      const existingFollowReward = await tx.tikTokFollowReward.findFirst({
        where: {
          customerId: input.customerId,
          id: { not: event.sourceId }
        },
        select: { id: true }
      });

      if (existingFollowReward) {
        shouldTransfer = false;
      }
    }

    const claimed = await tx.guestRewardEvent.updateMany({
      where: {
        id: event.id,
        status: "EARNED"
      },
      data: {
        status: shouldTransfer ? "TRANSFERRED" : "REVERSED",
        customerId: shouldTransfer ? input.customerId : null,
        transferredAt: now,
        note: shouldTransfer ? event.note : `${event.note} (duplicate customer reward blocked)`
      }
    });

    if (claimed.count === 0 || !shouldTransfer) {
      continue;
    }

    if (event.source === "RYO") {
      await tx.ryoClaim.updateMany({
        where: {
          id: event.sourceId,
          guestSessionId: input.guestSessionId
        },
        data: {
          customerId: input.customerId
        }
      });
    } else {
      await tx.tikTokFollowReward.updateMany({
        where: {
          id: event.sourceId,
          guestSessionId: input.guestSessionId
        },
        data: {
          customerId: input.customerId
        }
      });
    }

    await tx.rewardEntry.create({
      data: {
        customerId: input.customerId,
        type: "EARNED",
        points: event.points,
        note: event.note
      }
    });
    transferredPoints += event.points;
  }

  if (transferredPoints > 0) {
    await tx.customer.update({
      where: { id: input.customerId },
      data: {
        loyaltyPoints: {
          increment: transferredPoints
        }
      }
    });
  }

  if (input.markSessionConverted !== false) {
    await tx.guestRewardSession.update({
      where: { id: input.guestSessionId },
      data: {
        status: "CONVERTED",
        convertedCustomerId: input.customerId,
        convertedAt: now
      }
    });
  }

  return transferredPoints;
}
