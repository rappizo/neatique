import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OmbClaimStepThreeForm } from "@/components/order-match/omb-claim-step-three-form";
import { getOrderMatchPlatform, getOmbStepTwoErrorMessage, isHighRating } from "@/lib/order-match";
import { OMB_CLAIM_PROGRESS_STORAGE_KEY } from "@/lib/order-match-progress";
import { prisma } from "@/lib/db";

type OrderMatchStepThreePageProps = {
  searchParams: Promise<{ claim?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Order Match Last Step",
  description: "Finish the last OMB claim step with review proof and shipping details."
};

export default async function OrderMatchStepThreePage({
  searchParams
}: OrderMatchStepThreePageProps) {
  const params = await searchParams;
  const claimId = params.claim || "";

  if (!claimId) {
    redirect("/om");
  }

  const claim = await prisma.ombClaim.findUnique({
    where: { id: claimId }
  });

  if (!claim) {
    redirect("/om");
  }

  if (!claim.purchasedProduct || !claim.reviewRating || !claim.commentText) {
    redirect(`/om2?claim=${claim.id}`);
  }

  if (!isHighRating(claim.reviewRating)) {
    redirect(`/om2/thank-you?claim=${claim.id}`);
  }

  if (claim.completedAt) {
    redirect(`/om2/thank-you?claim=${claim.id}`);
  }

  const platform = getOrderMatchPlatform(claim.platformKey);
  const errorMessage = getOmbStepTwoErrorMessage(params.error);

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
            initialExtraBottleAddress={claim.extraBottleAddress}
            backHref={`/om2?claim=${claim.id}`}
            resumeStorageKey={OMB_CLAIM_PROGRESS_STORAGE_KEY}
            progressSaveAction="/api/om-progress"
          />
        </div>
      </div>
    </section>
  );
}
