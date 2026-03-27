import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Logo />
          <p>
            Advanced skincare essentials for modern routines, designed to feel refined, bright, and
            reliable from first use to finish.
          </p>
          <div className="site-footer__contact">
            <span>{siteConfig.supportEmail}</span>
            <span>{siteConfig.phone}</span>
            <span>Ships within the United States</span>
          </div>
        </div>
        <div>
          <h3>Shop</h3>
          <ul className="footer-link-list">
            {siteConfig.footerLinks.shop.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Discover</h3>
          <ul className="footer-link-list">
            {siteConfig.footerLinks.discover.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="site-footer__note">
          <h3>Policies</h3>
          <ul className="footer-link-list">
            {siteConfig.footerLinks.policies.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <p>(c) 2026 Neatique Beauty. All rights reserved.</p>
        <p>Secure checkout. Ships within 1 business day. 30 Days Money Back.</p>
      </div>
    </footer>
  );
}
