import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Settings</p>
        <h1>Keep the operational settings in one calm, predictable place.</h1>
        <p>
          Email and delivery settings now live here instead of taking up a top-level sidebar slot.
          Open the area you need, then return here when more system settings are added.
        </p>
      </div>

      <div className="cards-2">
        <section className="admin-card">
          <p className="eyebrow">Email</p>
          <h3>Email inbox and delivery</h3>
          <p>
            Manage Tracy&apos;s mailbox, SMTP or Brevo transactional delivery, test sending, inbox,
            sent mail, and AI-assisted replies.
          </p>
          <div className="stack-row">
            <Link href="/admin/email" className="button button--primary">
              Open email settings
            </Link>
          </div>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Brevo</p>
          <h3>Marketing sender and list connection</h3>
          <p>
            Update Brevo sender details, audience list IDs, sync behavior, and campaign delivery
            connection settings from the Email Marketing workspace.
          </p>
          <div className="stack-row">
            <Link href="/admin/email-marketing#brevo-connection" className="button button--secondary">
              Open Brevo connection
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
