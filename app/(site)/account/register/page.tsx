import { redirect } from "next/navigation";
import { registerCustomerAction } from "@/app/(site)/account/actions";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentCustomerId } from "@/lib/customer-auth";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const [customerId, params] = await Promise.all([getCurrentCustomerId(), searchParams]);

  if (customerId) {
    redirect("/account");
  }

  return (
    <section className="section">
      <div className="container">
        <div className="admin-login__panel">
          <p className="eyebrow">Create account</p>
          <h1>Register before checkout or claim your customer profile anytime.</h1>
          <p>
            Once registered, customers can track orders, manage points, and leave verified product
            reviews.
          </p>
          {params.error === "missing" ? <p className="notice">Please complete the required fields.</p> : null}
          <form action={registerCustomerAction} className="contact-form">
            <div className="form-row">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" name="firstName" />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" name="lastName" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required />
            </div>
            <label className="field field--checkbox">
              <input type="checkbox" name="marketingOptIn" />
              Email me about launches, routines, and special offers
            </label>
            <button type="submit" className="button button--primary">
              Create account
            </button>
          </form>
          <ButtonLink href="/account/login" variant="secondary">
            Already have an account?
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
