import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OmbClaimStepTwoForm } from "@/components/order-match/omb-claim-step-two-form";
import { getOrderMatchPlatform, getRyoStepErrorMessage } from "@/lib/order-match";
import { prisma } from "@/lib/db";
import { getOmbSelectableProducts } from "@/lib/queries";

type RegisterOrderStepTwoPageProps = {
  searchParams: Promise<{ platform?: string; claim?: string; status?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Register Your Order Step 2",
  description: "Choose the product you purchased and complete your order registration."
};

export default async function RegisterOrderStepTwoPage({
  searchParams
}: RegisterOrderStepTwoPageProps) {
  const params = await searchParams;
  const claimId = params.claim || "";

  if (!claimId) {
    redirect("/ryo");
  }

  const claim = await prisma.ryoClaim.findUnique({
    where: { id: claimId }
  });

  if (!claim) {
    redirect("/ryo");
  }

  const [platform, productOptions] = await Promise.all([
    Promise.resolve(getOrderMatchPlatform(claim.platformKey)),
    getOmbSelectableProducts()
  ]);
  const errorMessage = getRyoStepErrorMessage(params.error);

  return (
    <section className="section">
      <div className="container">
        {errorMessage ? <p className="notice">{errorMessage}</p> : null}

        <div className="section om-section">
          <OmbClaimStepTwoForm
            claimId={claim.id}
            platformKey={platform.key}
            platformLabel={claim.platformLabel}
            orderId={claim.orderId}
            name={claim.name}
            email={claim.email}
            phone={claim.phone}
            productOptions={productOptions.map((product) => ({
              id: product.id,
              name: product.name,
              shortName: product.productShortName || product.name,
              amazonAsin: product.amazonAsin
            }))}
            eyebrow="Reward Points / Step 2"
            title="Tell us what you purchased and how you feel about it."
            description="Your order verification from step 1 is already saved. Share the product, rating, and comment so we can finish your registration and credit the right account."
            submitAction="/api/ryo2"
            submitLabel="Continue"
          />
        </div>
      </div>
    </section>
  );
}
