import type { Metadata } from "next";
import { requestCustomerPasswordResetAction } from "@/app/(site)/account/actions";
import { ButtonLink } from "@/components/ui/button-link";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a secure password reset link for your Neatique customer account.",
  robots: { index: false, follow: false }
};

function getResetErrorMessage(error?: string) {
  switch (error) {
    case "missing":
      return "Please enter the email for your Neatique account.";
    case "email":
      return "Please enter a valid email address.";
    case "rate":
      return "Too many reset requests. Please wait 30 minutes and try again.";
    default:
      return null;
  }
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const errorMessage = getResetErrorMessage(params.error);

  return (
    <section className="section">
      <div className="container">
        <div className="admin-login__panel">
          <p className="eyebrow">Password help</p>
          <h1>Reset your password securely by email.</h1>
          <p>
            Enter the email connected to your Neatique points. If an account exists, we will send a
            a one-time reset link that expires after 30 minutes.
          </p>
          {errorMessage ? <p className="notice notice--warning">{errorMessage}</p> : null}
          <form action={requestCustomerPasswordResetAction} className="contact-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <button type="submit" className="button button--primary">
              Send reset link
            </button>
          </form>
          <ButtonLink href="/account/login" variant="secondary">
            Back to sign in
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
