import type { BrevoSettings } from "@/lib/brevo";
import { fetchBrevoContactsFromList } from "@/lib/brevo";
import { prisma } from "@/lib/db";
import type { EmailAudienceType } from "@/lib/types";

export async function getAudienceEmailsForSync(audienceType: EmailAudienceType) {
  const [newsletterRows, leadRows, optedInCustomers, importedContacts] = await Promise.all([
    prisma.formSubmission.findMany({
      where: {
        formKey: "subscribe"
      },
      select: {
        email: true
      },
      distinct: ["email"]
    }),
    prisma.formSubmission.findMany({
      where: {
        formKey: "contact"
      },
      select: {
        email: true
      },
      distinct: ["email"]
    }),
    prisma.customer.findMany({
      where: {
        marketingOptIn: true
      },
      select: {
        email: true
      }
    }),
    prisma.emailContact.findMany({
      where:
        audienceType === "ALL_MARKETING"
          ? {
              audienceType: {
                in: ["NEWSLETTER", "CUSTOMERS", "LEADS"]
              }
            }
          : {
              audienceType
            },
      select: {
        email: true
      },
      distinct: ["email"]
    })
  ]);

  const newsletterEmails = newsletterRows.map((row) => row.email);
  const leadEmails = leadRows.map((row) => row.email);
  const customerEmails = optedInCustomers.map((row) => row.email);
  const importedEmails = importedContacts.map((row) => row.email);

  if (audienceType === "NEWSLETTER") {
    return Array.from(new Set([...newsletterEmails, ...importedEmails]));
  }

  if (audienceType === "CUSTOMERS") {
    return Array.from(new Set([...customerEmails, ...importedEmails]));
  }

  if (audienceType === "LEADS") {
    return Array.from(new Set([...leadEmails, ...importedEmails]));
  }

  if (audienceType === "ALL_MARKETING") {
    return Array.from(new Set([...newsletterEmails, ...customerEmails, ...leadEmails, ...importedEmails]));
  }

  return importedEmails;
}

export async function importAudienceContactsFromBrevo(input: {
  audienceType: EmailAudienceType;
  listIds: number[];
  listNameById?: Map<number, string>;
  settings: BrevoSettings;
}) {
  const importedEmails = new Set<string>();
  let imported = 0;
  let failed = 0;

  for (const listId of input.listIds) {
    const contacts = await fetchBrevoContactsFromList({
      settings: input.settings,
      listId
    });

    for (const contact of contacts) {
      try {
        importedEmails.add(contact.email);

        await prisma.emailContact.upsert({
          where: {
            email_audienceType: {
              email: contact.email,
              audienceType: input.audienceType
            }
          },
          update: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            source: "BREVO_IMPORT",
            brevoContactId: contact.brevoContactId,
            brevoListId: listId,
            listName: input.listNameById?.get(listId) || `Brevo list ${listId}`,
            emailBlacklisted: contact.emailBlacklisted,
            metadata: contact.metadata,
            lastSyncedAt: new Date()
          },
          create: {
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            audienceType: input.audienceType,
            source: "BREVO_IMPORT",
            brevoContactId: contact.brevoContactId,
            brevoListId: listId,
            listName: input.listNameById?.get(listId) || `Brevo list ${listId}`,
            emailBlacklisted: contact.emailBlacklisted,
            metadata: contact.metadata,
            lastSyncedAt: new Date()
          }
        });

        imported += 1;
      } catch (error) {
        failed += 1;
        console.error("Brevo audience contact import failed:", error);
      }
    }
  }

  if (
    input.listIds.length === 1 &&
    (input.audienceType === "NEWSLETTER" || input.audienceType === "CUSTOMERS" || input.audienceType === "LEADS")
  ) {
    await prisma.emailContact.deleteMany({
      where: {
        audienceType: input.audienceType,
        source: "BREVO_IMPORT",
        email: {
          notIn: Array.from(importedEmails)
        }
      }
    });
  }

  return {
    imported,
    uniqueImported: importedEmails.size,
    failed
  };
}
