import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type OmbProgressPayload = {
  claimId?: unknown;
  extraBottleAddress?: unknown;
};

export async function POST(request: Request) {
  let payload: OmbProgressPayload;

  try {
    payload = (await request.json()) as OmbProgressPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid progress payload." }, { status: 400 });
  }

  const claimId = typeof payload.claimId === "string" ? payload.claimId.trim() : "";
  const extraBottleAddress =
    typeof payload.extraBottleAddress === "string" ? payload.extraBottleAddress.trim() : "";

  if (!claimId) {
    return NextResponse.json({ ok: false, error: "Missing OMB claim id." }, { status: 400 });
  }

  const claim = await prisma.ombClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      completedAt: true
    }
  });

  if (!claim) {
    return NextResponse.json({ ok: false, error: "OMB claim not found." }, { status: 404 });
  }

  if (claim.completedAt) {
    return NextResponse.json({ ok: true, status: "completed" });
  }

  await prisma.ombClaim.update({
    where: { id: claim.id },
    data: {
      extraBottleAddress: extraBottleAddress || null
    }
  });

  return NextResponse.json({ ok: true });
}
