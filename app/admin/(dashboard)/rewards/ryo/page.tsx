import {
  RewardsStatusNotice,
  RyoApprovalQueueSection,
  RyoFollowEmailSection
} from "@/app/admin/(dashboard)/rewards/_components/rewards-workspaces";
import { getBrevoSettings } from "@/lib/brevo";
import { formatNumber } from "@/lib/format";
import {
  getFollowEmailOverview,
  getRyoClaims,
  getStoreSettings
} from "@/lib/queries";

type AdminRyoRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRyoRewardsPage({ searchParams }: AdminRyoRewardsPageProps) {
  const [ryoClaims, followOverview, storeSettings, params] = await Promise.all([
    getRyoClaims(),
    getFollowEmailOverview("RYO"),
    getStoreSettings(),
    searchParams
  ]);
  const brevoSettings = getBrevoSettings(storeSettings);
  const awardedClaims = ryoClaims.filter((claim) => claim.rewardGranted).length;
  const awardedPoints = ryoClaims.reduce(
    (total, claim) => total + (claim.rewardGranted ? claim.pointsAwarded : 0),
    0
  );
  const inProgressClaims = ryoClaims.filter((claim) => !claim.completedAt).length;
  const customerListLabel = brevoSettings.customersListId
    ? `Brevo #${brevoSettings.customersListId}`
    : "Missing";

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points & Rewards / RYO</p>
        <h1>Monitor completed RYO submissions and the automatic points flow.</h1>
        <p>
          This page only loads RYO registrations, proof, automatic reward status, customer points,
          and the RYO follow email settings. Completed RYO submissions now receive points without
          manual approval.
        </p>
      </div>

      <RewardsStatusNotice status={params.status} label="RYO action" />

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(awardedClaims)}</strong>
          <span>Auto-awarded RYO</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(awardedPoints)}</strong>
          <span>Auto-awarded points</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(inProgressClaims)}</strong>
          <span>In progress</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(followOverview.totalSentToday)}</strong>
          <span>Follow emails today</span>
        </div>
      </div>

      <RyoFollowEmailSection
        followOverview={followOverview}
        customerListLabel={customerListLabel}
        redirectTo="/admin/rewards/ryo"
      />
      <RyoApprovalQueueSection ryoClaims={ryoClaims} />
    </div>
  );
}
