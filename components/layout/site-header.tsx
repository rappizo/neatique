import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/brand/logo";
import { SiteHeaderActions } from "@/components/layout/site-header-actions";

export function SiteHeader() {
  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-bar__inner">
          <div className="announcement-bar__copy">
            <p>Free shipping across the U.S. mainland. Subscribe for your 20% welcome code.</p>
            <div className="announcement-bar__links">
              <Link href="/#subscribe-offer">Get your 20% code</Link>
              <Link href="/contact">Need help choosing your routine?</Link>
            </div>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container site-header__inner">
          <Logo />
          <nav className="site-nav" aria-label="Primary navigation">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.href === "/shop" ? "site-nav__link site-nav__link--featured" : "site-nav__link"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SiteHeaderActions />
        </div>
      </header>
    </>
  );
}
