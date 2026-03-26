import { ButtonLink } from "@/components/ui/button-link";

export default function CheckoutCancelPage() {
  return (
    <section className="section">
      <div className="container empty-state">
        <p className="eyebrow">Checkout canceled</p>
        <h1>Your order was not completed.</h1>
        <p>
          No problem. You can return to the collection, compare textures again, or contact support
          if you need help choosing the right product.
        </p>
        <div className="stack-row">
          <ButtonLink href="/shop" variant="primary">
            Back to shop
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact support
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
