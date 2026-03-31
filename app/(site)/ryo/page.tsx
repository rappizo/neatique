import type { Metadata } from "next";
import { OrderMatchPanel } from "@/components/order-match/order-match-panel";
import { getOrderMatchErrorMessage, getOrderMatchPlatform } from "@/lib/order-match";

type RegisterOrderPageProps = {
  searchParams: Promise<{ platform?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Register Your Order",
  description: "Register your marketplace order and continue to the points flow."
};

export default async function RegisterOrderPage({ searchParams }: RegisterOrderPageProps) {
  const params = await searchParams;
  const activePlatform = getOrderMatchPlatform(params.platform);
  const errorMessage = getOrderMatchErrorMessage(params.error, "RYO registration");

  return (
    <section className="section">
      <div className="container">
        {errorMessage ? <p className="notice">{errorMessage}</p> : null}

        <div className="section om-section">
          <OrderMatchPanel
            initialPlatform={activePlatform.key}
            eyebrow="Reward Points / Step 1"
            title="Register Your Order (RYO) and Get 500 Points"
            submitAction="/api/ryo"
          />
        </div>
      </div>
    </section>
  );
}
