export const CANONICAL_HOSTNAME = "www.neatiquebeauty.com";

type SeoRouteDecision =
  | { type: "redirect"; destination: string }
  | { type: "gone" }
  | null;

const LEGACY_POST_REDIRECTS: Record<string, string> = {
  "3594": "/",
  "3833": "/shop/snail-mucin-serum",
  "4080": "/",
  "4280": "/"
};

const LEGACY_PAGE_REDIRECTS: Record<string, string> = {
  "3783": "/shipping-policy"
};

const CONSOLIDATED_CONTENT_REDIRECTS: Record<string, string> = {
  "/beauty-tips/pdrn-serum-lightweight-repair-serum-routine":
    "/beauty-tips/pdrn-peptide-serum-guide-smooth-hydrated-skin",
  "/beauty-tips/snail-mucin-routine-for-dry-skin":
    "/collections/snail-mucin-skincare"
};

function isRetiredWordPressPath(pathname: string) {
  return (
    pathname === "/test-campaign" ||
    pathname === "/omb" ||
    pathname === "/feed" ||
    pathname.startsWith("/tag/") ||
    pathname.startsWith("/product-category/") ||
    pathname.startsWith("/author/")
  );
}

export function resolveSeoRoute(input: URL): SeoRouteDecision {
  if (isRetiredWordPressPath(input.pathname)) {
    return { type: "gone" };
  }

  const target = new URL(input.toString());
  let shouldRedirect = false;

  const consolidatedDestination = CONSOLIDATED_CONTENT_REDIRECTS[target.pathname];
  if (consolidatedDestination) {
    target.pathname = consolidatedDestination;
    target.search = "";
    shouldRedirect = true;
  }

  if (target.protocol !== "https:") {
    target.protocol = "https:";
    shouldRedirect = true;
  }

  if (target.hostname === "neatiquebeauty.com") {
    target.hostname = CANONICAL_HOSTNAME;
    shouldRedirect = true;
  }

  if (target.pathname === "/private-policy") {
    target.pathname = "/privacy-policy";
    target.search = "";
    shouldRedirect = true;
  }

  const legacyPostId = target.searchParams.get("p");
  if (legacyPostId) {
    const destination = LEGACY_POST_REDIRECTS[legacyPostId];
    if (!destination) {
      return { type: "gone" };
    }

    target.pathname = destination;
    target.search = "";
    shouldRedirect = true;
  }

  const legacyPageId = target.searchParams.get("page_id");
  if (legacyPageId) {
    const destination = LEGACY_PAGE_REDIRECTS[legacyPageId];
    if (!destination) {
      return { type: "gone" };
    }

    target.pathname = destination;
    target.search = "";
    shouldRedirect = true;
  }

  if (target.pathname === "/shop" && target.searchParams.has("product_view")) {
    target.search = "";
    shouldRedirect = true;
  }

  if (target.searchParams.has("post_type")) {
    return { type: "gone" };
  }

  return shouldRedirect
    ? {
        type: "redirect",
        destination: target.toString()
      }
    : null;
}
