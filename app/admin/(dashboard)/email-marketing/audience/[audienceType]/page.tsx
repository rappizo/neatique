import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEmailAudienceContactAction } from "@/app/admin/actions";
import { formatDate, formatNumber } from "@/lib/format";
import { getEmailAudienceContactsPage } from "@/lib/queries";

type AdminEmailAudienceDetailPageProps = {
  params: Promise<{ audienceType: string }>;
  searchParams: Promise<{ status?: string; page?: string; email?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "contact-removed": "The contact was removed from this local audience and the linked Brevo list.",
  "remove-failed": "The contact could not be removed from Brevo. Please try again.",
  "missing-email": "Choose a contact email before attempting to remove it."
};

function normalizeAudienceType(value: string) {
  if (value === "NEWSLETTER" || value === "CUSTOMERS" || value === "LEADS") {
    return value;
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function AdminEmailAudienceDetailPage({
  params,
  searchParams
}: AdminEmailAudienceDetailPageProps) {
  const [{ audienceType: rawAudienceType }, query] = await Promise.all([params, searchParams]);
  const audienceType = normalizeAudienceType(rawAudienceType);

  if (!audienceType) {
    notFound();
  }

  const page = Number.parseInt(query.page || "1", 10);
  const searchEmail = (query.email || "").trim().toLowerCase();
  const record = await getEmailAudienceContactsPage(
    audienceType,
    Number.isFinite(page) ? page : 1,
    50,
    searchEmail
  );

  if (!record) {
    notFound();
  }

  const previousPage = record.currentPage > 1 ? record.currentPage - 1 : null;
  const nextPage = record.currentPage < record.totalPages ? record.currentPage + 1 : null;

  const buildPageHref = (nextPageNumber: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPageNumber));
    if (record.searchEmail) {
      params.set("email", record.searchEmail);
    }
    return `/admin/email-marketing/audience/${record.audienceType}?${params.toString()}`;
  };

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/email-marketing" className="button button--secondary">
          Back to email marketing
        </Link>
      </div>

      {query.status ? <p className="notice">{STATUS_MESSAGES[query.status] || `Audience action completed: ${query.status}.`}</p> : null}

      <section className="admin-page__header">
        <p className="eyebrow">Audience detail</p>
        <h1>{record.audienceLabel}</h1>
        <p>{record.audienceDescription}</p>
        <div className="page-hero__stats">
          <span className="pill">{formatNumber(record.totalCount)} imported contacts</span>
          <span className="pill">{record.targetListId ? `Brevo list ${record.targetListId}` : "No list configured"}</span>
          <span className="pill">
            Remote count {typeof record.remoteCount === "number" ? formatNumber(record.remoteCount) : "Unknown"}
          </span>
        </div>
      </section>

      <section className="admin-form">
        <form className="admin-toolbar admin-toolbar--filters" method="get">
          <div className="admin-toolbar__grid">
            <div className="field">
              <label htmlFor="audience-email-search">Search email</label>
              <input
                id="audience-email-search"
                name="email"
                defaultValue={record.searchEmail}
                placeholder="customer@example.com"
              />
            </div>
          </div>
          <div className="stack-row">
            <button type="submit" className="button button--secondary">
              Apply search
            </button>
            <Link href={`/admin/email-marketing/audience/${record.audienceType}`} className="button button--ghost">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="admin-table">
        <div className="admin-review-pagination">
          <div>
            <h2>Imported emails</h2>
            <p className="form-note">
              Removing a contact here also removes it from the linked Brevo list for this audience.
              If the same email still exists in your site subscriber data, a later sync can add it back.
            </p>
          </div>
          <p className="form-note">
            Showing {(record.currentPage - 1) * record.pageSize + (record.contacts.length > 0 ? 1 : 0)}-
            {(record.currentPage - 1) * record.pageSize + record.contacts.length} of {formatNumber(record.totalCount)}
          </p>
        </div>

        {record.contacts.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Source</th>
                  <th>List</th>
                  <th>Blacklisted</th>
                  <th>Last synced</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {record.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.email}</td>
                    <td>{[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "No name"}</td>
                    <td>{contact.source}</td>
                    <td>{contact.listName || (contact.brevoListId ? `List ${contact.brevoListId}` : "No list")}</td>
                    <td>{contact.emailBlacklisted ? "Yes" : "No"}</td>
                    <td>{formatDate(contact.lastSyncedAt)}</td>
                    <td>
                      <form action={deleteEmailAudienceContactAction}>
                        <input type="hidden" name="audienceType" value={record.audienceType} />
                        <input type="hidden" name="email" value={contact.email} />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={`/admin/email-marketing/audience/${record.audienceType}?page=${record.currentPage}${record.searchEmail ? `&email=${encodeURIComponent(record.searchEmail)}` : ""}`}
                        />
                        <button type="submit" className="button button--ghost">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-review-pagination">
              <span className="pill">
                Page {record.currentPage} of {record.totalPages}
              </span>
              <div className="stack-row">
                {previousPage ? (
                  <Link href={buildPageHref(previousPage)} className="button button--secondary">
                    Previous
                  </Link>
                ) : null}
                {nextPage ? (
                  <Link href={buildPageHref(nextPage)} className="button button--secondary">
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="admin-card">
            <h3>No imported contacts found</h3>
            <p>Import this audience from Brevo first, or change the email search.</p>
          </div>
        )}
      </section>
    </div>
  );
}
