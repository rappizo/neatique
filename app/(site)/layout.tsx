import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
