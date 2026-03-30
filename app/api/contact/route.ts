import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendContactSubmissionEmails } from "@/lib/email";
import { syncEmailMarketingContact } from "@/lib/email-marketing";
import { createFormSubmission } from "@/lib/form-submissions";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");
  const subject = String(formData.get("subject") || "");
  const message = String(formData.get("message") || "");

  const contactSubmission = await prisma.contactSubmission.create({
    data: {
      name,
      email,
      subject,
      message
    }
  });

  await createFormSubmission({
    formKey: "contact",
    email,
    name,
    subject,
    summary: subject,
    message,
    payload: {
      name,
      email,
      subject,
      message
    },
    legacyContactSubmissionId: contactSubmission.id
  });

  try {
    await syncEmailMarketingContact({
      email,
      audienceType: "LEADS"
    });
  } catch (error) {
    console.error("Brevo contact sync failed:", error);
  }

  try {
    await sendContactSubmissionEmails({
      name,
      email,
      subject,
      message
    });
  } catch (error) {
    console.error("Contact email delivery failed:", error);
  }

  return NextResponse.redirect(new URL("/contact?sent=1", request.url), 303);
}
