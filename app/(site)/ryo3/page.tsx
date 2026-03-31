import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OmbClaimStepThreeForm } from "@/components/order-match/omb-claim-step-three-form";
import { getOrderMatchPlatform, getRyoStepErrorMessage, isHighRating } from "@/lib/order-match";
import { prisma } from "@/lib/db";

type RegisterOrderStepThreePageProps = {
  searchParams: Promise<{ claim?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Register Your Order Last Step",
  description: "Finish the last registration step to receive Neatique reward points."
};

export default async function RegisterOrderStepThreePage({
  searchParams
}: RegisterOrderStepThreePageProps) {
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

  if (!claim.purchasedProduct || !claim.reviewRating || !claim.commentText) {
    redirect(`/ryo2?claim=${claim.id}`);
  }

  if (!isHighRating(claim.reviewRating)) {
    redirect(`/ryo2/thank-you?claim=${claim.id}`);
  }

  if (claim.completedAt) {
    redirect(`/ryo2/thank-you?claim=${claim.id}`);
  }

  const platform = getOrderMatchPlatform(claim.platformKey);
  const errorMessage = getRyoStepErrorMessage(params.error);

  return (
    <section className="section">
      <div className="container">
        {errorMessage ? <p className="notice">{errorMessage}</p> : null}

        <div className="section om-section">
          <OmbClaimStepThreeForm
            claimId={claim.id}
            platformKey={platform.key}
            platformLabel={claim.platformLabel}
            orderId={claim.orderId}
            name={claim.name}
            email={claim.email}
            phone={claim.phone}
            purchasedProduct={claim.purchasedProduct}
            reviewRating={claim.reviewRating}
            commentText={claim.commentText}
            destinationUrl={claim.reviewDestinationUrl}
            outboundButtonLabel={platform.outboundButtonLabel}
            eyebrow="Reward Points / Last Step"
            title="One last step and we can credit your 500 points."
            description={`Copy your review text, post it on ${platform.label}, then upload the proof if needed. Once this final step is submitted, your RYO registration is complete and the points can be added to your account.`}
            calloutText={`Copy the review text you already wrote, open the ${platform.label} review page, and paste the same text there before you finish the last registration step below.`}
            submitAction="/api/ryo3"
            submitLabel="Submit RYO Registration"
            includeAddress={false}
          />
        </div>
      </div>
    </section>
  );
}
