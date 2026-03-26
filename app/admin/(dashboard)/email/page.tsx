import { saveEmailSettingsAction } from "@/app/admin/actions";
import { getStoreSettings } from "@/lib/queries";

type AdminEmailPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminEmailPage({ searchParams }: AdminEmailPageProps) {
  const [settings, params] = await Promise.all([getStoreSettings(), searchParams]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Email</p>
        <h1>Configure SMTP email delivery for contact forms and customer account messages.</h1>
        <p>
          Once configured, the site can send contact notifications, auto-replies, and account
          emails such as checkout-created login credentials.
        </p>
      </div>

      {params.status === "saved" ? <p className="notice">Email settings were saved.</p> : null}

      <section className="admin-form">
        <h2>Email delivery settings</h2>
        <form action={saveEmailSettingsAction}>
          <div className="admin-form__grid">
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="email_enabled"
                defaultChecked={(settings.email_enabled || "false") === "true"}
              />
              Enable email sending
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                name="smtp_secure"
                defaultChecked={(settings.smtp_secure || "false") === "true"}
              />
              Use secure SMTP
            </label>
            <div className="field">
              <label htmlFor="smtp_host">SMTP host</label>
              <input id="smtp_host" name="smtp_host" defaultValue={settings.smtp_host || ""} />
            </div>
            <div className="field">
              <label htmlFor="smtp_port">SMTP port</label>
              <input id="smtp_port" name="smtp_port" defaultValue={settings.smtp_port || "587"} />
            </div>
            <div className="field">
              <label htmlFor="smtp_user">SMTP username</label>
              <input id="smtp_user" name="smtp_user" defaultValue={settings.smtp_user || ""} />
            </div>
            <div className="field">
              <label htmlFor="smtp_pass">SMTP password</label>
              <input id="smtp_pass" name="smtp_pass" type="password" defaultValue={settings.smtp_pass || ""} />
            </div>
            <div className="field">
              <label htmlFor="email_from_name">From name</label>
              <input
                id="email_from_name"
                name="email_from_name"
                defaultValue={settings.email_from_name || "Neatique Beauty"}
              />
            </div>
            <div className="field">
              <label htmlFor="email_from_address">From email</label>
              <input
                id="email_from_address"
                name="email_from_address"
                defaultValue={settings.email_from_address || ""}
              />
            </div>
            <div className="field">
              <label htmlFor="contact_recipient">Contact recipient</label>
              <input
                id="contact_recipient"
                name="contact_recipient"
                defaultValue={settings.contact_recipient || ""}
              />
            </div>
          </div>
          <button type="submit" className="button button--primary">
            Save email settings
          </button>
        </form>
      </section>
    </div>
  );
}
