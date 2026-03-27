import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { getCartItems } from "@/lib/cart";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button-link";

export async function SiteHeader() {
  const [customer, cartItems] = await Promise.all([getCurrentCustomer(), getCartItems()]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-bar__inner">
          <div className="announcement-bar__copy">
            <p>United States shipping only. Thoughtful skincare for smooth, hydrated, glowing skin.</p>
            <Link href="/contact">Need help choosing your routine?</Link>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container site-header__inner">
          <Logo />
          <nav className="site-nav" aria-label="Primary navigation">
            {siteConfig.nav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="site-header__actions">
            {customer ? (
              <Link href="/account" className="site-header__text-link">
                My Account
              </Link>
            ) : null}
            <Link href="/cart" className="site-header__text-link">
              Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>
            <ButtonLink href="/shop" variant="primary">
              Shop Now
            </ButtonLink>
          </div>
        </div>
      </header>
    </>
  );
}
