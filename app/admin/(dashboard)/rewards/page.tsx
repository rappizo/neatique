import {
  ManualPointAdjustmentSection,
  MascotRewardsSection,
  RewardsLedgerSection,
  RewardsStatusNotice,
  RewardWorkspaceLinks
} from "@/app/admin/(dashboard)/rewards/_components/rewards-workspaces";
import { formatNumber } from "@/lib/format";
import { getCustomers, getMascotRewards, getRewards } from "@/lib/queries";

type AdminRewardsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRewardsPage({ searchParams }: AdminRewardsPageProps) {
  const [customers, rewards, mascots, params] = await Promise.all([
    getCustomers(),
    getRewards(),
    getMascotRewards(),
    searchParams
  ]);
  const activeMascots = mascots.filter((mascot) => mascot.active).length;
  const manualAdjustments = rewards.filter((reward) => reward.type === "ADJUSTMENT").length;
  const netLedgerPoints = rewards.reduce((total, reward) => total + reward.points, 0);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Points & Rewards</p>
        <h1>Manage loyalty balances, mascot rewards, and reward-point history.</h1>
        <p>
          This overview now keeps point adjustments, mascot settings, and the ledger together.
          RYO completion tracking and mascot redemptions have dedicated subpages for focused daily handling.
        </p>
      </div>

      <RewardsStatusNotice status={params.status} />

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(activeMascots)}</strong>
          <span>Active mascots</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(customers.length)}</strong>
          <span>Reward customers</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(rewards.length)}</strong>
          <span>Ledger entries</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(manualAdjustments)}</strong>
          <span>Manual adjustments</span>
        </div>
      </div>

      <RewardWorkspaceLinks />

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatNumber(netLedgerPoints)}</strong>
          <span>Net ledger points</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(mascots.length)}</strong>
          <span>Mascot records</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(mascots.filter((mascot) => !mascot.active).length)}</strong>
          <span>Inactive mascots</span>
        </div>
        <div className="stat-card">
          <strong>{formatNumber(rewards.filter((reward) => reward.type === "EARNED").length)}</strong>
          <span>Earned entries</span>
        </div>
      </div>

      <MascotRewardsSection mascots={mascots} />
      <ManualPointAdjustmentSection customers={customers} />
      <RewardsLedgerSection rewards={rewards} />
    </div>
  );
}
