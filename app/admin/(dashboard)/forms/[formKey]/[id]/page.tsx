import Link from "next/link";
import { notFound } from "next/navigation";
import { FormHandledToggleButton } from "@/components/admin/form-handled-toggle-button";
import { formatDate } from "@/lib/format";
import { getFormSubmissionById, getFormSubmissionPage } from "@/lib/queries";

type AdminFormSubmissionDetailPageProps = {
  params: Promise<{ formKey: string; id: string }>;
  searchParams: Promise<{ status?: string }>;
};

function buildReplyEmailHref(input: {
  submissionId: string;
  email: string;
  subject?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("contactSubmissionId", input.submissionId);
  return `/admin/email?${params.toString()}`;
}

export default async function AdminFormSubmissionDetailPage({
  params,
  searchParams
}: AdminFormSubmissionDetailPageProps) {
  const [{ formKey, id }, query] = await Promise.all([params, searchParams]);
  const [submission, submissionPage] = await Promise.all([
    getFormSubmissionById(formKey, id),
    getFormSubmissionPage(formKey, 1, 50)
  ]);

  if (!submission || !submissionPage) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href={`/admin/forms/${formKey}`} className="button button--secondary">
          Back to {submissionPage.formLabel}
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
            Reply by email
          </Link>
        ) : null}
        {formKey === "contact" && submission.brevoContact ? (
          <Link href="/admin/email-marketing/audience/LEADS" className="button button--ghost">
            Open CRM list
          </Link>
        ) : null}
        <FormHandledToggleButton
          submissionId={submission.id}
          formKey={formKey}
          initialHandled={submission.handled}
          className="button button--ghost"
        />
      </div>

      {query.status ? <p className="notice">Submission action completed: {query.status}.</p> : null}

      <section className="admin-form">
        <div className="admin-page__header">
          <p className="eyebrow">
            {submission.formLabel} / {submission.email}
          </p>
          <h1>{submission.summary || submission.subject || "Submission details"}</h1>
          <p>
            Submitted {formatDate(submission.createdAt)}. Current status:{" "}
            {submission.handled ? "Handled" : "New"}.
          </p>
        </div>

        <div className="cards-2">
          <section className="admin-card">
            <h3>Submission summary</h3>
            <ul className="admin-list">
              <li>Email: {submission.email}</li>
              <li>Name: {submission.name || "Not provided"}</li>
              <li>Subject: {submission.subject || "Not provided"}</li>
              <li>Handled: {submission.handled ? "Yes" : "No"}</li>
              <li>Handled at: {submission.handledAt ? formatDate(submission.handledAt) : "Not handled yet"}</li>
              <li>Updated: {formatDate(submission.updatedAt)}</li>
              {formKey === "contact" ? (
                <li>
                  Brevo CRM:{" "}
                  {submission.brevoContact
                    ? `${submission.brevoContact.listName || `List ${submission.brevoContact.brevoListId ?? "unknown"}`} / synced ${formatDate(submission.brevoContact.lastSyncedAt)}`
                    : "Not synced yet"}
                </li>
              ) : null}
            </ul>
          </section>

          <section className="admin-card">
            <h3>Submitted content</h3>
            <ul className="detail-list">
              {submission.message ? (
                <li>{submission.message}</li>
              ) : (
                <li>No dedicated message body was provided for this form.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="field">
          <label>Raw payload</label>
          <textarea value={submission.payload || "No raw payload stored."} readOnly rows={12} />
        </div>
      </section>
    </div>
  );
}
