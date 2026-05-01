import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import CampaignsTable from "@/components/admin/CampaignsTable";

export const metadata = { title: "LME Admin · Campaigns" };

function MetricCard({
  label,
  value,
  trend,
  accent = false,
}: {
  label: string;
  value: string | number;
  trend?: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-5 ${
        accent
          ? "border-teal-500/40 bg-gradient-to-br from-teal-500/10 to-[#111111]"
          : "border-[#252525] bg-[#111111]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono">
        {label}
      </p>
      <p
        className="text-4xl mt-2 text-white"
        style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
      >
        {value}
      </p>
      {trend ? <p className="text-xs mt-2 text-gray-500">{trend}</p> : null}
    </article>
  );
}

export default async function CampaignsPage() {
  const [campaigns, stats] = await Promise.all([
    fetchQuery(api.campaigns.listCampaigns, { limit: 50 }),
    fetchQuery(api.campaigns.getMarketingStats, {}),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-400 font-mono">
            LME · Marketing
          </p>
          <h1
            className="text-4xl mt-1"
            style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
          >
            Campaigns
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            All email campaigns sent from your account.
          </p>
        </div>
        <Link
          href="/admin/marketing/compose"
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-md text-sm transition-colors"
        >
          + New campaign
        </Link>
      </header>

      <section aria-labelledby="campaign-metrics-heading">
        <h2 id="campaign-metrics-heading" className="sr-only">
          Campaign performance summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Campaigns Sent"
            value={stats.totalCampaigns.toLocaleString()}
            trend="all time"
            accent
          />
          <MetricCard
            label="Sends This Month"
            value={stats.sendsThisMonth.toLocaleString()}
            trend="new this month"
          />
          <MetricCard
            label="Total Sends"
            value={stats.totalRecipients.toLocaleString()}
            trend="emails delivered"
          />
          <MetricCard
            label="Active Subscribers"
            value={stats.activeContacts.toLocaleString()}
            trend={`of ${stats.totalContacts.toLocaleString()} contacts`}
          />
        </div>
      </section>

      <section aria-labelledby="campaigns-table-heading">
        <h2
          id="campaigns-table-heading"
          className="text-sm uppercase tracking-[0.2em] text-gray-300 font-mono mb-3"
        >
          All Campaigns
        </h2>
        <CampaignsTable campaigns={campaigns} />
      </section>
    </div>
  );
}
