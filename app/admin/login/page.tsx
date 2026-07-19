import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { Logo } from "@/components/brand/logo";
import { getAdminSession } from "@/lib/admin-auth";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const session = await getAdminSession();

  if (session) {
    redirect(session.role === "finance" ? "/admin/finance" : "/admin");
  }

  const params = await searchParams;

  return (
    <section className="admin-login">
      <div className="admin-login__panel">
        <Logo href="/" />
        <div>
          <p className="eyebrow">Admin access</p>
          <h1>Manage products, orders, users, points, and SEO posts.</h1>
          <p>
            Use your admin or finance credentials to enter the Neatique operations dashboard.
          </p>
        </div>
        {params.error === "1" ? <p className="notice">Invalid username or password.</p> : null}
        {params.error === "rate" ? (
          <p className="notice">Too many sign-in attempts. Please wait 30 minutes and try again.</p>
        ) : null}
        {params.error === "config" ? (
          <p className="notice">Admin access is not configured. Add an admin password in the deployment environment.</p>
        ) : null}
        <form action={loginAction} className="contact-form">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button type="submit" className="button button--primary">
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}
