import type { Metadata } from "next";
import Image from "next/image";
import { TikTokFollowUploadForm } from "@/components/mascot/tiktok-follow-upload-form";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatNumber } from "@/lib/format";
import { getGuestRewardSession, getGuestRewardSummary } from "@/lib/guest-rewards";
import { getActiveMascotRewards } from "@/lib/queries";
import { getMascotPromoQrImageUrl, MASCOT_REDEMPTION_POINTS, RYO_REWARD_POINTS } from "@/lib/mascot-program";

type MascotPageProps = {
  searchParams: Promise<{
    follow?: string;
    followError?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Mascot Rewards",
  description: "Learn how to earn points and redeem Neatique mascot rewards."
};

function getFollowUploadErrorMessage(error?: string) {
  switch (error) {
    case "missing":
      return "Please enter your name and email before uploading the screenshot.";
    case "email":
      return "Please enter a valid email for your reward receipt.";
    case "image-required":
      return "Please upload a screenshot showing that you followed Neatique on TikTok.";
    case "image-size":
      return "That screenshot is too large. Please upload a smaller image.";
    case "image-type":
      return "Please upload a PNG, JPG, WebP, or AVIF image.";
    case "failed":
      return "We could not save the screenshot. Please try again.";
    default:
      return null;
  }
}

export default async function MascotPage({ searchParams }: MascotPageProps) {
  const [mascots, customer, params, guestSession] = await Promise.all([
    getActiveMascotRewards(),
    getCurrentCustomer(),
    searchParams,
    getGuestRewardSession()
  ]);
  const guestSummary = guestSession ? await getGuestRewardSummary(guestSession.id) : null;
  const pointsBalance = (customer?.loyaltyPoints ?? 0) + (guestSummary?.points ?? 0);
  const qrImageUrl = getMascotPromoQrImageUrl();
  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(" ")
    : "";
  const followErrorMessage = getFollowUploadErrorMessage(params.followError);

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Mascot Rewards</p>
          <h1>Earn 1,000 points and redeem a Neatique mascot.</h1>
          <p>
            Two simple actions can unlock your reward: <strong>upload your TikTok follow screenshot
            for {formatNumber(RYO_REWARD_POINTS)} points</strong>, then <strong>complete RYO for
            another {formatNumber(RYO_REWARD_POINTS)} points</strong>. Once your balance reaches{" "}
            <strong>{formatNumber(MASCOT_REDEMPTION_POINTS)} points</strong>, choose your favorite
            mascot and redeem it.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{formatNumber(RYO_REWARD_POINTS)} points for TikTok follow screenshot</span>
            <span className="pill">{formatNumber(RYO_REWARD_POINTS)} points when RYO is completed</span>
            <span className="pill">{formatNumber(MASCOT_REDEMPTION_POINTS)} points per mascot</span>
            <span className="pill">Your available balance: {formatNumber(pointsBalance)} points</span>
          </div>
        </div>

        <section className="story-sections section--tight">
          <article className="admin-form mascot-story-card mascot-story-card--wide">
            <p className="eyebrow">Way 1</p>
            <h2>Follow Neatique on TikTok, upload the screenshot, and get 500 points automatically.</h2>
            <p>
              Scan the QR code, follow us on TikTok, then upload a screenshot here. The upload
              adds <strong>500 points</strong> to a secure reward balance in this browser. We only
              create or connect your account after you confirm a mascot redemption.
            </p>

            {params.follow === "awarded" ? (
              <p className="notice">
                <strong>500 points added.</strong> Your reward is saved in this browser. No account
                was created.
              </p>
            ) : null}
            {params.follow === "duplicate" ? (
              <p className="notice">
                This browser has already received the TikTok follow reward. You can keep collecting
                points through RYO.
              </p>
            ) : null}
            {params.follow === "duplicate-proof" ? (
              <p className="notice">
                This screenshot has already been used for a TikTok follow reward.
              </p>
            ) : null}
            {followErrorMessage ? <p className="notice notice--warning">{followErrorMessage}</p> : null}

            <div className="mascot-follow-layout">
              <div className="mascot-qr">
                <Image src={qrImageUrl} alt="Neatique TikTok QR code" width={360} height={360} unoptimized />
              </div>
              <div className="mascot-follow-panel">
                <p className="eyebrow">Screenshot upload</p>
                <h3>Show us the follow, then watch your balance move.</h3>
                <p>
                  No sign-in is needed. Your points stay attached to a secure browser session. At
                  the final redemption step, we verify your email and then create or connect your
                  account.
                </p>
                <TikTokFollowUploadForm
                  customerName={customerName}
                  customerEmail={customer?.email || ""}
                />
              </div>
            </div>
          </article>

          <article className="admin-form mascot-story-card mascot-story-card--wide">
            <p className="eyebrow">Way 2</p>
            <h2>Complete RYO after purchase and get another 500 points automatically.</h2>
            <p>
              After your purchase, open the Register Your Order flow, verify the order, and submit
              the short registration. As soon as the RYO flow is complete, <strong>500 points are
              saved to your reward balance</strong>. Finish both actions and you will have enough
              points for one mascot—without registering first.
            </p>
            <div className="stack-row">
              <ButtonLink href="/ryo" variant="primary">
                Register your order
              </ButtonLink>
              <ButtonLink href="/rd" variant="secondary">
                Redeem mascots
              </ButtonLink>
            </div>
          </article>
        </section>

        <section className="section section--tight">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Redeem catalog</p>
            <h2>Pick the mascot you want once your balance reaches 1,000 points.</h2>
          </div>

          <div className="mascot-grid">
            {mascots.map((mascot) => (
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
                    <p>{mascot.description || "Redeem this mascot once your points are ready."}</p>
                  </div>
                  <div className="mascot-card__footer">
                    <p className="mascot-card__hint">
                      Save up your points, then open the redeem page to claim this mascot.
                    </p>
                    <ButtonLink href={`/rd?mascot=${mascot.slug}`} variant="secondary" className="mascot-card__cta">
                      View redeem option
                    </ButtonLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
