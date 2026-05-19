import { Logo } from "@/components/brand/logo";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { logoutAction } from "@/app/admin/actions";
import type { AdminSession } from "@/lib/admin-auth";
import { siteConfig } from "@/lib/site-config";

export function AdminShell({
  children,
  session
}: Readonly<{
  children: React.ReactNode;
  session: AdminSession;
}>) {
  const isFinanceUser = session.role === "finance";
  const adminNav = isFinanceUser
    ? siteConfig.adminNav.filter((item) => item.href === "/admin/finance")
    : siteConfig.adminNav;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo href={isFinanceUser ? "/admin/finance" : "/admin"} />
        <div className="admin-sidebar__meta">
          <span className="pill">{session.username}</span>
          <span className="pill">{isFinanceUser ? "Finance access" : "Admin portal"}</span>
        </div>
        <AdminSidebarNav items={adminNav} />
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
