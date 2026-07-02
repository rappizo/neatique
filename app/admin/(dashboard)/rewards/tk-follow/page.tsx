import {
  RewardsStatusNotice,
  TikTokFollowRewardsSection
} from "@/app/admin/(dashboard)/rewards/_components/rewards-workspaces";
import { formatNumber } from "@/lib/format";
import { getTikTokFollowRewards } from "@/lib/queries";

type AdminTkFollowRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminTkFollowRewardsPage({
  searchParams
}: AdminTkFollowRewardsPageProps) {
  const [followRewards, params] = await Promise.all([
    getTikTokFollowRewards(),
    searchParams
  ]);
  const awardedUploads = followRewards.filter((reward) => reward.rewardGranted).length;
  const awardedPoints = followRewards.reduce(
    (total, reward) => total + (reward.rewardGranted ? reward.pointsAwarded : 0),
    0
  );
  const uniqueCustomers = new Set(followRewards.map((reward) => reward.customerId)).size;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points & Rewards / TK Follow</p>
        <h1>Review TikTok follow screenshot uploads and automatic point awards.</h1>
        <p>
          This page only loads TK Follow proof uploads, customer balances, point award status, and
          each customer&apos;s recent point ledger.
        </p>
      </div>

      <RewardsStatusNotice status={params.status} label="TK Follow action" />

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(followRewards.length)}</strong>
          <span>Total uploads</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(awardedUploads)}</strong>
          <span>Auto-awarded uploads</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(awardedPoints)}</strong>
          <span>Auto-awarded points</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(uniqueCustomers)}</strong>
          <span>Customers</span>
        </div>
      </div>

      <TikTokFollowRewardsSection followRewards={followRewards} />
    </div>
  );
}
