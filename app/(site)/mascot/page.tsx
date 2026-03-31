import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { formatNumber } from "@/lib/format";
import { getActiveMascotRewards } from "@/lib/queries";
import { getMascotPromoQrImageUrl, MASCOT_REDEMPTION_POINTS, RYO_REWARD_POINTS } from "@/lib/mascot-program";

export const metadata: Metadata = {
  title: "Mascot Rewards",
  description: "Learn how to earn points and redeem Neatique mascot rewards."
};

export default async function MascotPage() {
  const mascots = await getActiveMascotRewards();
  const qrImageUrl = getMascotPromoQrImageUrl();

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Mascot Rewards</p>
          <h1>Collect points, then trade {formatNumber(MASCOT_REDEMPTION_POINTS)} of them for a mascot.</h1>
          <p>
            Neatique points are not checkout cash. They are saved for mascot rewards so customers
            can earn something playful after supporting the brand.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{formatNumber(RYO_REWARD_POINTS)} points for TikTok follow confirmation</span>
            <span className="pill">{formatNumber(RYO_REWARD_POINTS)} points for order registration</span>
            <span className="pill">{formatNumber(MASCOT_REDEMPTION_POINTS)} points per mascot</span>
          </div>
        </div>

        <section className="story-sections section--tight">
          <article className="admin-form mascot-story-card">
            <p className="eyebrow">Way 1</p>
            <h2>Follow our TikTok and confirm it with the team to receive 500 points.</h2>
            <p>
              Scan the code, follow Neatique on TikTok, then reach out in TikTok so the team can
              confirm the follow and manually credit your account with points.
            </p>
            <div className="mascot-qr">
              <Image src={qrImageUrl} alt="Neatique TikTok QR code" width={360} height={360} unoptimized />
            </div>
          </article>

          <article className="admin-form mascot-story-card">
            <p className="eyebrow">Way 2</p>
            <h2>Purchase a product and register the order through RYO to receive another 500 points.</h2>
            <p>
              After your purchase, open the Register Your Order flow, verify the order, and submit
              the short registration. Once our team reviews and approves it, the reward points are
              added to your account so you can move toward a mascot redemption.
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
            <h2>Choose the mascot you want once your balance reaches 1,000 points.</h2>
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
