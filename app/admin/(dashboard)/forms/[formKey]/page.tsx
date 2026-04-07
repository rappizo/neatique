import Link from "next/link";
import { notFound } from "next/navigation";
import { FormHandledToggleButton } from "@/components/admin/form-handled-toggle-button";
import { formatDate } from "@/lib/format";
import { getFormSubmissionPage } from "@/lib/queries";

type AdminFormSubmissionListPageProps = {
  params: Promise<{ formKey: string }>;
  searchParams: Promise<{ page?: string; email?: string; status?: string }>;
};

const pageSize = 50;

function buildPageHref(formKey: string, page: number, searchEmail: string) {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (searchEmail) {
    params.set("email", searchEmail);
  }

  return `/admin/forms/${formKey}?${params.toString()}`;
}

function buildReplyEmailHref(input: {
  submissionId: string;
  email: string;
  subject?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("contactSubmissionId", input.submissionId);
  return `/admin/email?${params.toString()}`;
}

export default async function AdminFormSubmissionListPage({
  params,
  searchParams
}: AdminFormSubmissionListPageProps) {
  const [{ formKey }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Number.parseInt(query.page || "1", 10);
  const submissionPage = await getFormSubmissionPage(
    formKey,
    Number.isFinite(requestedPage) ? requestedPage : 1,
    pageSize,
    query.email || ""
  );

  if (!submissionPage) {
    notFound();
  }

  const {
    formLabel,
    description,
    submissions,
    totalCount,
    unhandledCount,
    currentPage,
    totalPages,
    searchEmail
  } = submissionPage;
  const fromSubmission = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toSubmission = Math.min(currentPage * pageSize, totalCount);
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Forms / {formLabel}</p>
        <h1>Review {formLabel.toLowerCase()} submissions.</h1>
        <p>{description}</p>
      </div>

      <div className="stack-row">
        <Link href="/admin/forms" className="button button--secondary">
          Back to forms
        </Link>
        <span className="pill">{unhandledCount} unhandled</span>
        <span className="pill">{totalCount} total</span>
      </div>

      {query.status ? <p className="notice">Submission action completed: {query.status}.</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Submission list</h2>
            <p className="form-note">
              Showing {fromSubmission} to {toSubmission} of {totalCount} submissions.
            </p>
          </div>

          <form method="get" className="admin-inline-form">
            <div className="field">
              <label htmlFor="email">Search email</label>
              <input
                id="email"
                name="email"
                defaultValue={searchEmail}
                placeholder="customer@example.com"
              />
            </div>
            <button type="submit" className="button button--secondary">
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="admin-review-list">
        {submissions.length > 0 ? (
          submissions.map((submission) => (
            <article key={submission.id} className="admin-form admin-review-item">
              <div className="admin-review-item__header">
                <div>
                  <h3>{submission.summary || submission.subject || submission.email}</h3>
                  <p>
                    {submission.email} / {formatDate(submission.createdAt)} /{" "}
                    {submission.handled ? "Handled" : "New"}
                  </p>
                </div>
                <div className="stack-row">
                  <span className="pill">{submission.formLabel}</span>
                  {submission.handled ? <span className="pill">Handled</span> : <span className="pill">New</span>}
                </div>
              </div>
              <p>{submission.message || submission.summary || "Open the detail page to view the full payload."}</p>
              <div className="stack-row">
                <Link href={`/admin/forms/${formKey}/${submission.id}`} className="button button--primary">
                  View details
                </Link>
                {formKey === "contact" ? (
                  <Link
                    href={buildReplyEmailHref({
                      submissionId: submission.id,
                      email: submission.email,
                      subject: submission.subject
                    })}
                    className="button button--secondary"
                  >
                    Reply
                  </Link>
                ) : null}
                <FormHandledToggleButton
                  submissionId={submission.id}
                  formKey={formKey}
                  initialHandled={submission.handled}
                />
              </div>
            </article>
          ))
        ) : (
          <section className="admin-form admin-review-item">
            <h3>No submissions found</h3>
            <p>Try another email search or wait for new entries from the storefront.</p>
          </section>
        )}
      </div>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div className="stack-row">
            <Link
              href={currentPage > 1 ? buildPageHref(formKey, currentPage - 1, searchEmail) : "#"}
              className={`button button--secondary${currentPage > 1 ? "" : " button--disabled"}`}
              aria-disabled={currentPage <= 1}
            >
              Previous
            </Link>
            <span className="pill">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={currentPage < totalPages ? buildPageHref(formKey, currentPage + 1, searchEmail) : "#"}
              className={`button button--secondary${currentPage < totalPages ? "" : " button--disabled"}`}
              aria-disabled={currentPage >= totalPages}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
