import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatDate, formatNumber } from "@/lib/format";
import { getActiveMascotRewards, getCustomerAccountById } from "@/lib/queries";
import { MASCOT_REDEMPTION_POINTS } from "@/lib/mascot-program";
import { CONTIGUOUS_US_STATES } from "@/lib/us-address";

type RedeemMascotPageProps = {
  searchParams: Promise<{ mascot?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Redeem Mascots",
  description: "Use Neatique reward points to redeem mascot rewards."
};

export default async function RedeemMascotPage({ searchParams }: RedeemMascotPageProps) {
  const [mascots, customer, params] = await Promise.all([
    getActiveMascotRewards(),
    getCurrentCustomer(),
    searchParams
  ]);
  const account = customer ? await getCustomerAccountById(customer.id) : null;
  const selectedMascot = mascots.find((mascot) => mascot.slug === params.mascot) ?? null;
  const latestRedemption = account?.mascotRedemptions[0] ?? null;
  const latestOrder = account?.orders[0] ?? null;
  const defaultFullName =
    latestRedemption?.fullName ||
    latestOrder?.shippingName ||
    [account?.customer.firstName, account?.customer.lastName].filter(Boolean).join(" ");
  const defaultAddress1 = latestRedemption?.address1 || latestOrder?.shippingAddress1 || "";
  const defaultAddress2 = latestRedemption?.address2 || latestOrder?.shippingAddress2 || "";
  const defaultCity = latestRedemption?.city || latestOrder?.shippingCity || "";
  const defaultState = latestRedemption?.state || latestOrder?.shippingState || "";
  const defaultPostalCode = latestRedemption?.postalCode || latestOrder?.shippingPostalCode || "";
  const pointsBalance = account?.customer.loyaltyPoints ?? 0;

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Redeem Points</p>
          <h1>Trade points for mascot rewards, not for checkout discounts.</h1>
          <p>
            Every mascot redemption costs {formatNumber(MASCOT_REDEMPTION_POINTS)} points. Reward
            points stay completely separate from cash discounts and can only be used for mascot
            rewards.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{mascots.length} mascot rewards</span>
            <span className="pill">{formatNumber(MASCOT_REDEMPTION_POINTS)} points each</span>
            <span className="pill">
              {customer ? `${formatNumber(pointsBalance)} points in your account` : "Sign in to redeem"}
            </span>
          </div>
        </div>

        {params.error === "auth" ? (
          <p className="notice">Please sign in to redeem mascot rewards with your points.</p>
        ) : null}
        {params.error === "mascot" ? (
          <p className="notice">We could not find that mascot reward. Please choose another one.</p>
        ) : null}
        {params.error === "points" ? (
          <p className="notice">Your current balance is not enough for this mascot yet.</p>
        ) : null}
        {params.error === "address" ? (
          <p className="notice">Please complete every required shipping field before redeeming.</p>
        ) : null}
        {params.error === "state" ? (
          <p className="notice">Please select a valid contiguous U.S. state.</p>
        ) : null}
        {params.error === "postal" ? (
          <p className="notice">Please enter a valid U.S. ZIP code.</p>
        ) : null}

        {!customer ? (
          <section className="admin-form">
            <h2>Sign in to redeem</h2>
            <p>
              Your points balance is attached to your Neatique account. Sign in first, then return
              here to redeem a mascot.
            </p>
            <div className="stack-row">
              <ButtonLink href="/account/login" variant="primary">
                Sign in
              </ButtonLink>
              <ButtonLink href="/account/register" variant="secondary">
                Create account
              </ButtonLink>
            </div>
          </section>
        ) : null}

        <section className="section section--tight">
          <div className="mascot-grid">
            {mascots.map((mascot) => {
              const canRedeem = pointsBalance >= mascot.pointsCost;

              return (
                <article key={mascot.id} className="product-card mascot-card">
                  <div className="product-card__media">
                    <Image src={mascot.imageUrl} alt={mascot.name} width={520} height={520} unoptimized />
                  </div>
                  <div className="product-card__body">
                    <div className="mascot-card__meta">
                      <span>{mascot.sku}</span>
                      <span>{formatNumber(mascot.pointsCost)} points</span>
                    </div>
                    <div className="mascot-card__title">
                      <h3>{mascot.name}</h3>
                      <p>{mascot.description || "Redeem this mascot with reward points."}</p>
                    </div>
                    <div className="mascot-card__footer">
                      <div className="mascot-card__status-row">
                        <span
                          className={`mascot-card__status ${
                            canRedeem ? "mascot-card__status--ready" : "mascot-card__status--waiting"
                          }`}
                        >
                          {canRedeem ? "Ready to redeem" : "Need more points"}
                        </span>
                        <span className="mascot-card__hint">
                          {canRedeem
                            ? `${formatNumber(pointsBalance)} points available`
                            : `${formatNumber(mascot.pointsCost - pointsBalance)} points to go`}
                        </span>
                      </div>
                      <ButtonLink
                        href={`/rd?mascot=${mascot.slug}`}
                        variant={canRedeem ? "primary" : "secondary"}
                        className="mascot-card__cta"
                      >
                        {canRedeem ? "Redeem now" : "Need more points"}
                      </ButtonLink>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {customer && selectedMascot ? (
          <section className="checkout-confirmation-layout">
            <div className="checkout-confirmation-main">
              <section className="admin-form">
                <div className="checkout-confirmation-form__header">
                  <div>
                    <p className="eyebrow">Redeem {selectedMascot.name}</p>
                    <h2>Confirm the shipping address for your mascot reward.</h2>
                  </div>
                  <span className="pill">{formatNumber(pointsBalance)} current points</span>
                </div>

                {pointsBalance < selectedMascot.pointsCost ? (
                  <p className="notice">
                    You need {formatNumber(selectedMascot.pointsCost - pointsBalance)} more points
                    before this mascot can be redeemed.
                  </p>
                ) : (
                  <form action="/rd/redeem" method="post" className="checkout-confirmation-form">
                    <input type="hidden" name="mascotSlug" value={selectedMascot.slug} />

                    <section className="admin-form checkout-confirmation-form__body">
                      <div className="admin-form__grid">
                        <div className="field">
                          <label htmlFor="rd-full-name">Full name</label>
                          <input
                            id="rd-full-name"
                            name="fullName"
                            defaultValue={defaultFullName}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="rd-address1">Address line 1</label>
                          <input
                            id="rd-address1"
                            name="address1"
                            defaultValue={defaultAddress1}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="rd-address2">Address line 2</label>
                          <input id="rd-address2" name="address2" defaultValue={defaultAddress2} />
                        </div>
                        <div className="field">
                          <label htmlFor="rd-city">City</label>
                          <input id="rd-city" name="city" defaultValue={defaultCity} required />
                        </div>
                        <div className="field">
                          <label htmlFor="rd-state">State</label>
                          <select id="rd-state" name="state" defaultValue={defaultState} required>
                            <option value="">Select a state</option>
                            {CONTIGUOUS_US_STATES.map((state) => (
                              <option key={state.code} value={state.code}>
                                {state.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="rd-postal-code">ZIP code</label>
                          <input
                            id="rd-postal-code"
                            name="postalCode"
                            defaultValue={defaultPostalCode}
                            inputMode="numeric"
                            required
                          />
                        </div>
                      </div>
                      <div className="stack-row checkout-confirmation-form__actions">
                        <button type="submit" className="button button--primary">
                          Redeem {selectedMascot.name}
                        </button>
                      </div>
                    </section>
                  </form>
                )}
              </section>
            </div>

            <aside className="admin-form checkout-confirmation-summary">
              <h2>Redeem summary</h2>
              <div className="checkout-confirmation-summary__lines">
                <article className="checkout-confirmation-summary__line">
                  <div>
                    <strong>{selectedMascot.name}</strong>
                    <p>{selectedMascot.sku}</p>
                  </div>
                  <strong>{formatNumber(selectedMascot.pointsCost)} pts</strong>
                </article>
              </div>
              <div className="checkout-confirmation-summary__totals">
                <div>
                  <span>Your balance</span>
                  <strong>{formatNumber(pointsBalance)}</strong>
                </div>
                <div>
                  <span>Points after redeem</span>
                  <strong>{formatNumber(Math.max(0, pointsBalance - selectedMascot.pointsCost))}</strong>
                </div>
              </div>
              <p className="form-note">
                Rewards points never reduce product prices at checkout. This redemption only creates
                a mascot shipment request for the address above.
              </p>
              {account?.mascotRedemptions.length ? (
                <div className="checkout-confirmation-summary__coupons">
                  <p className="eyebrow">Recent mascot redemptions</p>
                  {account.mascotRedemptions.slice(0, 3).map((redemption) => (
                    <div key={redemption.id} className="pill">
                      <strong>{redemption.mascotName}</strong>
                      <span>{formatDate(redemption.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>
          </section>
        ) : null}
      </div>
    </section>
  );
}
