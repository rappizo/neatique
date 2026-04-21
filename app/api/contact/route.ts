import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assessContactSubmissionRisk,
  getClientIpFromHeaders,
  getUserAgentFromHeaders,
  normalizeContactSubmissionInput,
  validateContactSubmissionInput
} from "@/lib/contact-guard";
import { sendContactSubmissionEmails } from "@/lib/email";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import { createFormSubmission } from "@/lib/form-submissions";

export async function POST(request: Request) {
  const formData = await request.formData();
  const submission = normalizeContactSubmissionInput(formData);
  const validationError = validateContactSubmissionInput(submission);

  if (validationError) {
    return NextResponse.redirect(new URL("/contact?status=invalid", request.url), 303);
  }

  const ipAddress = getClientIpFromHeaders(request.headers);
  const userAgent = getUserAgentFromHeaders(request.headers);
  const moderation = await assessContactSubmissionRisk({
    submission,
    ipAddress
  });

  if (moderation.blocked) {
    console.warn("Blocked suspicious contact submission", {
      email: submission.email,
      reasons: moderation.reasons,
      score: moderation.score,
      ipAddress
    });
    return NextResponse.redirect(new URL("/contact?sent=1", request.url), 303);
  }

  const contactSubmission = await prisma.contactSubmission.create({
    data: {
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message
    }
  });

  await createFormSubmission({
    formKey: "contact",
    email: submission.email,
    name: submission.name,
    subject: submission.subject,
    summary: submission.subject,
    message: submission.message,
    payload: {
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message,
      meta: {
        ipAddress,
        userAgent,
        startedAt: submission.startedAt,
        submittedAt: new Date().toISOString()
      },
      moderation
    },
    legacyContactSubmissionId: contactSubmission.id
  });

  try {
    await syncEmailMarketingContact({
      email: submission.email,
      audienceType: "LEADS",
      force: true
    });
  } catch (error) {
    console.error("Brevo contact sync failed:", error);
  }

  try {
    await sendContactSubmissionEmails({
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message
    });
  } catch (error) {
    console.error("Contact email delivery failed:", error);
  }

  return NextResponse.redirect(new URL("/contact?sent=1", request.url), 303);
}
