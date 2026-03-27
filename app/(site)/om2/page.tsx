import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OmbClaimStepTwoForm } from "@/components/order-match/omb-claim-step-two-form";
import { getOrderMatchPlatform, getOmbStepTwoErrorMessage } from "@/lib/order-match";
import { prisma } from "@/lib/db";

type OrderMatchStepTwoPageProps = {
  searchParams: Promise<{ platform?: string; claim?: string; status?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Order Match Step 2",
  description: "Verified order details and ready for the next order-match step."
};

export default async function OrderMatchStepTwoPage({
  searchParams
}: OrderMatchStepTwoPageProps) {
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

  const platform = getOrderMatchPlatform(claim.platformKey);
  const errorMessage = getOmbStepTwoErrorMessage(params.error);

  return (
    <section className="section">
      <div className="container">
        {params.status === "submitted" ? (
          <p className="notice">Your OMB claim details were submitted successfully.</p>
        ) : null}
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
          />
        </div>
      </div>
    </section>
  );
}
