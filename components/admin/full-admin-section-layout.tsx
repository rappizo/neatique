import { requireFullAdminSession } from "@/lib/admin-auth";

export async function FullAdminSectionLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireFullAdminSession();
  return <>{children}</>;
}
