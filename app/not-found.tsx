import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <section className="container empty-state">
      <p className="eyebrow">Page not found</p>
      <h1>That page is not available yet.</h1>
      <p>
        The storefront is still being expanded. You can return to the homepage or continue browsing
        the current collection.
      </p>
      <div className="stack-row">
        <ButtonLink href="/" variant="primary">
          Back home
        </ButtonLink>
        <ButtonLink href="/shop" variant="secondary">
          Visit shop
        </ButtonLink>
      </div>
    </section>
  );
}
