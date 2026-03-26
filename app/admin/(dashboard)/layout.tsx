import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminSession();
  return <AdminShell>{children}</AdminShell>;
}
