import type { Metadata } from "next";
import { OrderMatchPanel } from "@/components/order-match/order-match-panel";
import { getOrderMatchErrorMessage, getOrderMatchPlatform } from "@/lib/order-match";
import { OMB_CLAIM_PROGRESS_STORAGE_KEY } from "@/lib/order-match-progress";
import { prisma } from "@/lib/db";

type OrderMatchPageProps = {
  searchParams: Promise<{ platform?: string; error?: string; claim?: string }>;
};

export const metadata: Metadata = {
  title: "Order Match",
  description: "Verify Amazon, TikTok, and Walmart order IDs before continuing to the next step."
};

export default async function OrderMatchPage({ searchParams }: OrderMatchPageProps) {
  const params = await searchParams;
  const restoredClaim = params.claim
    ? await prisma.ombClaim.findUnique({
        where: { id: params.claim }
      })
    : null;
  const activePlatform = getOrderMatchPlatform(restoredClaim?.platformKey ?? params.platform);
  const errorMessage = getOrderMatchErrorMessage(params.error);

  return (
    <section className="section">
      <div className="container">
        {errorMessage ? <p className="notice">{errorMessage}</p> : null}

        <div className="section om-section">
          <OrderMatchPanel
            initialPlatform={activePlatform.key}
            initialValues={
              restoredClaim
                ? {
                    claimId: restoredClaim.id,
                    orderId: restoredClaim.orderId,
                    name: restoredClaim.name,
                    email: restoredClaim.email,
                    phone: restoredClaim.phone
                  }
                : undefined
            }
            resumeStorageKey={OMB_CLAIM_PROGRESS_STORAGE_KEY}
          />
        </div>
      </div>
    </section>
  );
}
