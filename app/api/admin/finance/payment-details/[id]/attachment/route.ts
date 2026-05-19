import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type FinancePaymentAttachmentRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: FinancePaymentAttachmentRouteProps) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const detail = await prisma.financePaymentDetail.findUnique({
    where: { id },
    select: {
      paymentProofBase64: true,
      paymentProofMimeType: true,
      paymentProofName: true
    }
  });

  if (!detail?.paymentProofBase64 || !detail.paymentProofMimeType) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(detail.paymentProofBase64, "base64"), {
    status: 200,
    headers: {
      "Content-Type": detail.paymentProofMimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(detail.paymentProofName || "payment-proof")}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
