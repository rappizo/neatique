import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendContactSubmissionEmails } from "@/lib/email";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");
  const subject = String(formData.get("subject") || "");
  const message = String(formData.get("message") || "");

  await prisma.contactSubmission.create({
    data: {
      name,
      email,
      subject,
      message
    }
  });

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
