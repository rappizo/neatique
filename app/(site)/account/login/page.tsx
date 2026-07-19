import { redirect } from "next/navigation";
import { loginCustomerAction } from "@/app/(site)/account/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentCustomerId } from "@/lib/customer-auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [customerId, params] = await Promise.all([getCurrentCustomerId(), searchParams]);

  if (customerId) {
    redirect("/account");
  }

  return (
    <section className="section">
      <div className="container">
        <div className="admin-login__panel">
          <p className="eyebrow">Customer login</p>
          <h1>Sign in to view orders, points, and reviews.</h1>
          <p>
            Customers can log in after registering, or after receiving an account email triggered
            during checkout.
          </p>
          {params.error === "invalid" ? <p className="notice">Incorrect email or password.</p> : null}
          {params.error === "rate" ? (
            <p className="notice">Too many sign-in attempts. Please wait 30 minutes and try again.</p>
          ) : null}
          {params.error === "exists" ? (
            <p className="notice">That email already has an account. Please sign in instead.</p>
          ) : null}
          {params.status === "reset-sent" ? (
            <p className="notice">If that email has an account, a secure reset link is on the way.</p>
          ) : null}
          {params.status === "reset-complete" ? (
            <p className="notice">Your password is updated. You can now sign in.</p>
          ) : null}
          <form action={loginCustomerAction} className="contact-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button type="submit" className="button button--primary">
              Sign in
            </button>
          </form>
          <ButtonLink href="/account/forgot-password" variant="ghost">
            Forgot password?
          </ButtonLink>
          <ButtonLink href="/account/register" variant="secondary">
            Create account
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
