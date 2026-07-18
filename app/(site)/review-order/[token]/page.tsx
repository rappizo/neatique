import Image from "next/image";
import { OrderReviewSubmitButton } from "@/components/product/order-review-submit-button";
import { getOrderReviewAccess } from "@/lib/order-review";
import { submitOrderReviewAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderReviewPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string; product?: string }>;
};

function getStatusMessage(status: string | undefined) {
  if (status === "submitted") {
    return "Thank you! Your verified review was submitted and is waiting for approval.";
  }

  if (status === "already-submitted") {
    return "A review for this product has already been received from this order.";
  }

  if (status === "invalid-review") {
    return "Please add a short title and at least 10 characters of review text.";
  }

  return null;
}

export default async function OrderReviewPage({ params, searchParams }: OrderReviewPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const access = await getOrderReviewAccess(token);

  if (!access) {
    return (
      <section className="section section--tight order-review-page">
        <div className="container order-review-container">
          <div className="panel order-review-intro">
            <p className="eyebrow">Review link unavailable</p>
            <h1>This review link is not active.</h1>
            <p>
              The link may be incomplete, or the order may no longer be eligible for a verified
              review. Please contact our support team if you need help.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const submittedProductIds = new Set(access.reviews.map((review) => review.productId));
  const statusMessage = getStatusMessage(query.status);
  const remainingReviewCount = access.products.filter(
    (product) => product.productId && !submittedProductIds.has(product.productId)
  ).length;

  return (
    <section className="section section--tight order-review-page">
      <div className="container order-review-container">
        <header className="panel order-review-intro">
          <p className="eyebrow">Verified purchase · {access.orderNumber}</p>
          <h1>How did your Neatique products work for you?</h1>
          <p>
            No sign-in is needed. Your private order link confirms the purchase, and each review
            is matched only to a product from this order.
          </p>
          <div className="order-review-intro__meta">
            <span>Posting as {access.displayName}</span>
            <span>{access.products.length} product{access.products.length === 1 ? "" : "s"}</span>
          </div>
        </header>

        {statusMessage ? (
          <p className="notice order-review-notice" role="status">
            {statusMessage}
          </p>
        ) : null}

        {access.products.length === 0 ? (
          <section className="panel order-review-intro">
            <h2>No reviewable products were found.</h2>
            <p>Please contact support and include order number {access.orderNumber}.</p>
          </section>
        ) : (
          <div className="order-review-list">
            {access.products.map((product) => {
              const productId = product.productId as string;
              const reviewed = submittedProductIds.has(productId);
              const highlighted = query.product === productId;

              return (
                <article
                  key={product.id}
                  id={`product-${productId}`}
                  className={`panel order-review-card${highlighted ? " order-review-card--highlighted" : ""}`}
                >
                  <div className="order-review-card__product">
                    <div className="order-review-card__image-wrap">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={180}
                        height={180}
                        unoptimized
                        className="order-review-card__image"
                      />
                    </div>
                    <div>
                      <p className="eyebrow">Verified purchase</p>
                      <h2>{product.name}</h2>
                      <p className="form-note">Quantity {product.quantity}</p>
                    </div>
                  </div>

                  {reviewed ? (
                    <div className="order-review-complete">
                      <span aria-hidden="true">✓</span>
                      <div>
                        <strong>Review received</strong>
                        <p>Thank you. This review is now in the approval queue.</p>
                      </div>
                    </div>
                  ) : (
                    <form action={submitOrderReviewAction} className="order-review-form">
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="productId" value={productId} />

                      <fieldset className="order-review-rating">
                        <legend>Your rating</legend>
                        <div className="order-review-rating__options">
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <label key={rating}>
                              <input
                                type="radio"
                                name="rating"
                                value={rating}
                                defaultChecked={rating === 5}
                                required
                              />
                              <span>{rating} ★</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className="field">
                        <label htmlFor={`review-title-${productId}`}>Review title</label>
                        <input
                          id={`review-title-${productId}`}
                          name="title"
                          type="text"
                          minLength={3}
                          maxLength={120}
                          placeholder="A short summary of your experience"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor={`review-content-${productId}`}>Your review</label>
                        <textarea
                          id={`review-content-${productId}`}
                          name="content"
                          minLength={10}
                          maxLength={5000}
                          placeholder="Tell us how you used it and what you noticed."
                          required
                        />
                      </div>

                      <OrderReviewSubmitButton />
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {remainingReviewCount === 0 && access.products.length > 0 ? (
          <section className="panel order-review-all-complete">
            <p className="eyebrow">All done</p>
            <h2>Thank you for reviewing your order.</h2>
            <p>Your feedback helps other customers choose the right formula for their routine.</p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
