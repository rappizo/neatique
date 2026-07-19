import type { Metadata } from "next";
import { completeCustomerPasswordResetAction } from "@/app/(site)/account/actions";
import { ButtonLink } from "@/components/ui/button-link";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Neatique customer account.",
  robots: { index: false, follow: false }
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "password":
      return "Use a password between 12 and 128 characters.";
    case "rate":
      return "Too many attempts. Please wait 30 minutes or request a new reset link.";
    case "invalid":
      return "This reset link is invalid, expired, or has already been used.";
    default:
      return null;
  }
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token || "";
  const errorMessage = getErrorMessage(params.error);

  return (
    <section className="section">
      <div className="container">
        <div className="admin-login__panel">
          <p className="eyebrow">Secure password reset</p>
          <h1>Choose a new account password.</h1>
          <p>The reset link expires after 30 minutes and can only be used once.</p>
          {errorMessage ? <p className="notice notice--warning">{errorMessage}</p> : null}
          {token ? (
            <form action={completeCustomerPasswordResetAction} className="contact-form">
              <input type="hidden" name="token" value={token} />
              <div className="field">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <small>Use 12–128 characters.</small>
              </div>
              <button type="submit" className="button button--primary">
                Update password
              </button>
            </form>
          ) : (
            <p className="notice notice--warning">Request a new link to continue.</p>
          )}
          <ButtonLink href="/account/forgot-password" variant="secondary">
            Request a new reset link
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
