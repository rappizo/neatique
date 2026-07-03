import {
  RedemptionRequestsSection,
  RewardsStatusNotice
} from "@/app/admin/(dashboard)/rewards/_components/rewards-workspaces";
import { formatNumber } from "@/lib/format";
import { getMascotRedemptions } from "@/lib/queries";

type AdminRedemptionRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRedemptionRewardsPage({
  searchParams
}: AdminRedemptionRewardsPageProps) {
  const [redemptions, params] = await Promise.all([getMascotRedemptions(), searchParams]);
  const pendingRedemptions = redemptions.filter((redemption) => redemption.status === "REQUESTED").length;
  const fulfilledRedemptions = redemptions.filter((redemption) => redemption.status === "FULFILLED").length;
  const cancelledRedemptions = redemptions.filter((redemption) => redemption.status === "CANCELLED").length;
  const pointsSpent = redemptions.reduce((total, redemption) => total + redemption.pointsSpent, 0);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points & Rewards / Redemption</p>
        <h1>Process mascot redemption requests without the rest of the rewards console.</h1>
        <p>
          This page only loads mascot redemption requests, TikTok/RYO verification proof, shipping
          details, fulfillment status, shipment email logs, points spent, and internal notes.
        </p>
      </div>

      <RewardsStatusNotice status={params.status} label="Redemption action" />

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(pendingRedemptions)}</strong>
          <span>Pending redemptions</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(fulfilledRedemptions)}</strong>
          <span>Fulfilled redemptions</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(cancelledRedemptions)}</strong>
          <span>Cancelled redemptions</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(pointsSpent)}</strong>
          <span>Points spent</span>
        </div>
      </div>

      <RedemptionRequestsSection
        redemptions={redemptions}
        redirectTo="/admin/rewards/redemption"
      />
    </div>
  );
}
