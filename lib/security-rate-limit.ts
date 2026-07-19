import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientIpFromHeaders } from "@/lib/contact-guard";

type RateLimitRule = {
  scope: string;
  identifiers: string[];
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function makeKey(scope: string, identifier: string) {
  return createHash("sha256")
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export function getSecurityIdentifiers(headers: Headers, subject?: string | null) {
  const identifiers: string[] = [];
  const ipAddress = getClientIpFromHeaders(headers);

  if (ipAddress) {
    identifiers.push(`ip:${ipAddress}`);
  }

  if (subject?.trim()) {
    identifiers.push(`subject:${subject.trim().toLowerCase()}`);
  }

  return identifiers.length > 0 ? identifiers : ["request:unidentified"];
}

async function consumeOne(input: Omit<RateLimitRule, "identifiers"> & { identifier: string }) {
  const key = makeKey(input.scope, input.identifier);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const existing = await tx.securityRateLimit.findUnique({ where: { key } });

          if (existing?.blockedUntil && existing.blockedUntil > now) {
            return {
              allowed: false,
              retryAfterSeconds: Math.max(
                1,
                Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000)
              )
            };
          }

          const windowExpired =
            !existing || now.getTime() - existing.windowStartedAt.getTime() >= input.windowMs;
          const nextCount = windowExpired ? 1 : existing.count + 1;
          const blockedUntil =
            nextCount > input.maxAttempts ? new Date(now.getTime() + input.blockMs) : null;

          await tx.securityRateLimit.upsert({
            where: { key },
            create: {
              key,
              count: nextCount,
              windowStartedAt: now,
              blockedUntil
            },
            update: {
              count: nextCount,
              windowStartedAt: windowExpired ? now : existing?.windowStartedAt ?? now,
              blockedUntil
            }
          });

          return {
            allowed: !blockedUntil,
            retryAfterSeconds: blockedUntil ? Math.ceil(input.blockMs / 1000) : 0
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const isRetryableConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034");

      if (!isRetryableConflict || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Could not update the security rate limit.");
}

export async function consumeSecurityRateLimit(input: RateLimitRule): Promise<RateLimitResult> {
  let retryAfterSeconds = 0;

  for (const identifier of [...new Set(input.identifiers)]) {
    const result = await consumeOne({
      scope: input.scope,
      identifier,
      maxAttempts: input.maxAttempts,
      windowMs: input.windowMs,
      blockMs: input.blockMs
    });

    if (!result.allowed) {
      retryAfterSeconds = Math.max(retryAfterSeconds, result.retryAfterSeconds);
    }
  }

  return {
    allowed: retryAfterSeconds === 0,
    retryAfterSeconds
  };
}
