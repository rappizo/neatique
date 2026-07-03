import { prisma } from "@/lib/db";
import { sendConfiguredEmail } from "@/lib/email";
import { toOrderEmailHtml } from "@/lib/order-emails";
import {
  formatShippingCarrierLabel,
  formatTrackingNumbers,
  normalizeShippingCarrier,
  normalizeTrackingNumber
} from "@/lib/order-shipping";
import type { MascotRedemptionStatus, ShippingCarrier } from "@/lib/types";

type MascotRedemptionForEmail = {
  id: string;
  email: string;
  fullName: string;
  shippingCarrier: ShippingCarrier | null;
  trackingNumber: string | null;
  mascot?: {
    name: string;
    sku: string;
  } | null;
};

export class MascotRedemptionUpdateError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
  }
}

function normalizeStatus(value: string | null | undefined): MascotRedemptionStatus {
  if (value === "FULFILLED" || value === "CANCELLED") {
    return value;
  }

  return "REQUESTED";
}

function buildShippingEmail(redemption: MascotRedemptionForEmail) {
  const carrier = formatShippingCarrierLabel(redemption.shippingCarrier) || "Carrier not available";
  const trackingNumbers = formatTrackingNumbers(redemption.trackingNumber) || "Tracking not available";
  const mascotName = redemption.mascot?.name || "your Neatique mascot";
  const subject = `Your Neatique mascot redemption has shipped`;
  const bodyText = `Hi ${redemption.fullName || "there"},

Your ${mascotName} redemption has shipped.

Carrier: ${carrier}
Tracking number: ${trackingNumbers}

Our team reviewed your TikTok following screenshot and RYO submission before shipping this reward. Please keep an eye out for delivery updates from the carrier.

Best regards,
Neatique Team`;

  return { subject, bodyText };
}

async function createMascotRedemptionEmailLog(input: {
  redemption: MascotRedemptionForEmail;
  subject: string;
  bodyText: string;
  deliveryStatus: "SENT" | "FAILED";
  deliveryProvider?: string | null;
  deliveryMessageId?: string | null;
  errorReason?: string | null;
}) {
  return prisma.mascotRedemptionEmailLog.create({
    data: {
      redemptionId: input.redemption.id,
      eventType: "MASCOT_SHIPPED",
      recipientEmail: input.redemption.email,
      recipientName: input.redemption.fullName,
      subject: input.subject,
      bodyText: input.bodyText,
      deliveryStatus: input.deliveryStatus,
      deliveryProvider: input.deliveryProvider ?? null,
      deliveryMessageId: input.deliveryMessageId ?? null,
      errorReason: input.errorReason ?? null
    }
  });
}

export async function sendMascotRedemptionShippingEmail(redemption: MascotRedemptionForEmail) {
  if (!redemption.shippingCarrier || !redemption.trackingNumber) {
    return null;
  }

  const { subject, bodyText } = buildShippingEmail(redemption);

  try {
    const result = await sendConfiguredEmail({
      to: redemption.email,
      subject,
      text: bodyText,
      html: toOrderEmailHtml(bodyText)
    });

    if (result.delivered) {
      return createMascotRedemptionEmailLog({
        redemption,
        subject,
        bodyText,
        deliveryStatus: "SENT",
        deliveryProvider: result.provider,
        deliveryMessageId: result.messageId ?? null
      });
    }

    return createMascotRedemptionEmailLog({
      redemption,
      subject,
      bodyText,
      deliveryStatus: "FAILED",
      deliveryProvider: result.provider ?? null,
      errorReason: result.reason
    });
  } catch (error) {
    return createMascotRedemptionEmailLog({
      redemption,
      subject,
      bodyText,
      deliveryStatus: "FAILED",
      errorReason: error instanceof Error ? error.message : "Mascot redemption email failed."
    });
  }
}

export async function updateMascotRedemptionWithShipping(input: {
  id: string;
  status: string | null | undefined;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  adminNote?: string | null;
}) {
  const status = normalizeStatus(input.status);
  const shippingCarrier = normalizeShippingCarrier(input.shippingCarrier);
  const trackingNumber = normalizeTrackingNumber(input.trackingNumber);

  if (status === "FULFILLED" && (!shippingCarrier || !trackingNumber)) {
    throw new MascotRedemptionUpdateError(
      "Carrier and tracking number are required before marking a mascot redemption as fulfilled.",
      "redemption-shipping-required"
    );
  }

  const existing = await prisma.mascotRedemption.findUnique({
    where: { id: input.id },
    include: {
      mascot: true,
      emailLogs: {
        orderBy: [{ createdAt: "desc" }]
      }
    }
  });

  if (!existing) {
    throw new MascotRedemptionUpdateError("Mascot redemption not found.", "missing-redemption");
  }

  const previousTracking = normalizeTrackingNumber(existing.trackingNumber);
  const shipmentChanged =
    existing.shippingCarrier !== shippingCarrier || previousTracking !== trackingNumber;
  const alreadySentShippedEmail = existing.emailLogs.some(
    (log) => log.eventType === "MASCOT_SHIPPED" && log.deliveryStatus === "SENT"
  );
  const shouldSendShippingEmail =
    status === "FULFILLED" &&
    Boolean(shippingCarrier && trackingNumber) &&
    (existing.status !== "FULFILLED" || shipmentChanged || !alreadySentShippedEmail);
  const completedAt = status === "FULFILLED" ? existing.fulfilledAt ?? new Date() : null;
  const shippedAt = status === "FULFILLED" ? existing.shippedAt ?? new Date() : null;

  const redemption = await prisma.mascotRedemption.update({
    where: { id: input.id },
    data: {
      status,
      shippingCarrier,
      trackingNumber,
      shippedAt,
      fulfilledAt: completedAt,
      adminNote: input.adminNote ?? null
    },
    include: {
      mascot: true
    }
  });

  const emailLog = shouldSendShippingEmail
    ? await sendMascotRedemptionShippingEmail(redemption)
    : null;

  return { redemption, emailLog };
}
