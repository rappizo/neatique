import { prisma } from "@/lib/db";

export const FORM_DEFINITIONS = [
  {
    key: "contact",
    label: "Contact",
    description: "Messages submitted from the contact page."
  },
  {
    key: "subscribe",
    label: "Subscribe",
    description: "Newsletter and first-purchase coupon signups from the homepage."
  }
] as const;

export function getFormDefinition(formKey: string) {
  return FORM_DEFINITIONS.find((form) => form.key === formKey) ?? null;
}

export function serializeFormPayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2);
}

export async function createFormSubmission(input: {
  formKey: string;
  email: string;
  name?: string | null;
  subject?: string | null;
  summary?: string | null;
  message?: string | null;
  payload?: Record<string, unknown>;
  legacyContactSubmissionId?: string | null;
}) {
  const definition = getFormDefinition(input.formKey);

  if (!definition) {
    throw new Error(`Unknown form key: ${input.formKey}`);
  }

  return prisma.formSubmission.create({
    data: {
      formKey: definition.key,
      formLabel: definition.label,
      email: input.email.trim().toLowerCase(),
      name: input.name ?? null,
      subject: input.subject ?? null,
      summary: input.summary ?? null,
      message: input.message ?? null,
      payload: input.payload ? serializeFormPayload(input.payload) : null,
      legacyContactSubmissionId: input.legacyContactSubmissionId ?? null
    }
  });
}

let contactBackfillPromise: Promise<void> | null = null;

async function backfillLegacyContactSubmissionsOnce() {
  const [legacyContacts, existingMirrors] = await prisma.$transaction([
    prisma.contactSubmission.findMany({
      orderBy: [{ createdAt: "asc" }]
    }),
    prisma.formSubmission.findMany({
      where: {
        legacyContactSubmissionId: {
          not: null
        }
      },
      select: {
        legacyContactSubmissionId: true
      }
    })
  ]);

  const mirroredIds = new Set(
    existingMirrors
      .map((submission) => submission.legacyContactSubmissionId)
      .filter((value): value is string => Boolean(value))
  );

  for (const contact of legacyContacts) {
    if (mirroredIds.has(contact.id)) {
      continue;
    }

    await createFormSubmission({
      formKey: "contact",
      email: contact.email,
      name: contact.name,
      subject: contact.subject,
      summary: contact.subject,
      message: contact.message,
      payload: {
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message
      },
      legacyContactSubmissionId: contact.id
    });
  }
}

export async function ensureLegacyContactFormBackfill() {
  if (contactBackfillPromise) {
    return contactBackfillPromise;
  }

  contactBackfillPromise = backfillLegacyContactSubmissionsOnce().finally(() => {
    contactBackfillPromise = null;
  });

  return contactBackfillPromise;
}
