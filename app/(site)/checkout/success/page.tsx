import { ClearCartOnLoad } from "@/components/cart/clear-cart-on-load";
import { ButtonLink } from "@/components/ui/button-link";
import { AnalyticsEvent } from "@/components/analytics/analytics-event";
import { getPurchaseAnalytics } from "@/lib/purchase-analytics";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const purchase = sessionId ? await getPurchaseAnalytics(sessionId).catch(() => null) : null;

  return (
    <section className="section">
      <div className="container empty-state">
        <ClearCartOnLoad />
        {purchase ? (
          <AnalyticsEvent
            eventName="purchase"
            params={purchase.params}
            dedupeKey={`purchase:${purchase.transactionId}`}
            dedupeStorage="local"
          />
        ) : null}
        <p className="eyebrow">Checkout complete</p>
        <h1>Your order has been received.</h1>
        <p>
          Thank you for shopping with Neatique. Your checkout was completed successfully and we will
          begin preparing your order.
        </p>
        <div className="stack-row">
          <ButtonLink href="/shop" variant="primary">
            Continue shopping
          </ButtonLink>
          <ButtonLink href="/beauty-tips" variant="secondary">
            Read beauty tips
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
