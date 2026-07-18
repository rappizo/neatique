"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";

type HeaderState = {
  signedIn: boolean;
  cartCount: number;
};

export function SiteHeaderActions() {
  const pathname = usePathname();
  const [state, setState] = useState<HeaderState>({ signedIn: false, cartCount: 0 });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/site-header", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((nextState: HeaderState | null) => {
        if (nextState) {
          setState(nextState);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [pathname]);

  return (
    <div className="site-header__actions">
      <Link href={state.signedIn ? "/account" : "/account/login"} className="site-header__text-link">
        My Account
      </Link>
      <ButtonLink href="/cart" variant="primary">
        Cart{state.cartCount > 0 ? ` (${state.cartCount})` : ""}
      </ButtonLink>
    </div>
  );
}
