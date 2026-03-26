import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { logoutAction } from "@/app/admin/actions";
import { siteConfig } from "@/lib/site-config";

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo href="/admin" />
        <div className="admin-sidebar__meta">
          <span className="pill">Admin portal</span>
          <span className="pill">US store operations</span>
        </div>
        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {siteConfig.adminNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="admin-sidebar__logout">
            Sign out
          </button>
        </form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
