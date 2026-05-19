import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdminSession();
  return <AdminShell session={session}>{children}</AdminShell>;
}
