import Link from "next/link";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";

export const metadata = { title: "LME Admin · Marketing Overview" };

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRate(rate: number) {
  if (!rate || rate <= 0) return "—";
  const pct = rate * 100;
  return `${pct.toFixed(pct >= 10 ? 0 : 1)}%`;
}

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
      {trend ? (
        <p className="text-xs mt-2 text-gray-500">{trend}</p>
      ) : null}
    </article>
  );
}

export default async function MarketingOverviewPage() {
  const [stats, recentCampaigns, recentSignups] = await Promise.all([
    fetchQuery(api.campaigns.getMarketingStats, {}),
    fetchQuery(api.campaigns.listCampaigns, { limit: 5, status: "sent" }),
    fetchQuery(api.contacts.getRecentSignups, { limit: 8 }),
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
            Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back. Here&apos;s how your emails are performing.
          </p>
        </div>
        <Link
          href="/admin/marketing/compose"
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-md text-sm transition-colors"
        >
          + New campaign
        </Link>
      </header>

      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Contacts"
            value={stats.totalContacts.toLocaleString()}
            trend={`${stats.activeContacts} active`}
            accent
          />
          <MetricCard
            label="Active Subscribers"
            value={stats.activeContacts.toLocaleString()}
            trend={`${stats.unsubscribedContacts} unsubscribed`}
          />
          <MetricCard
            label="Sends This Month"
            value={stats.sendsThisMonth.toLocaleString()}
            trend={`${stats.totalCampaigns} campaigns all-time`}
          />
          <MetricCard
            label="Total Recipients"
            value={stats.totalRecipients.toLocaleString()}
            trend="emails delivered"
          />
        </div>
      </section>

      <section aria-labelledby="engagement-heading">
        <h2
          id="engagement-heading"
          className="text-sm uppercase tracking-[0.2em] text-gray-300 font-mono mb-3"
        >
          Engagement (all-time)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Delivered"
            value={stats.totalDelivered.toLocaleString()}
            trend="confirmed by Resend"
          />
          <MetricCard
            label="Avg Open Rate"
            value={formatRate(stats.avgOpenRate)}
            trend={`${stats.totalOpens.toLocaleString()} unique opens`}
          />
          <MetricCard
            label="Avg Click Rate"
            value={formatRate(stats.avgClickRate)}
            trend={`${stats.totalClicks.toLocaleString()} unique clicks`}
          />
          <MetricCard
            label="Tracked Events"
            value={(
              stats.totalDelivered +
              stats.totalOpens +
              stats.totalClicks
            ).toLocaleString()}
            trend="delivered + opens + clicks"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <section aria-labelledby="recent-campaigns-heading">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="recent-campaigns-heading"
              className="text-sm uppercase tracking-[0.2em] text-gray-300 font-mono"
            >
              Recent Campaigns
            </h2>
            <Link
              href="/admin/marketing/campaigns"
              className="text-xs text-teal-400 hover:text-teal-300"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-xl border border-[#252525] bg-[#111111] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono border-b border-[#1f1f1f]">
                  <th className="py-3 px-4 font-medium">Campaign</th>
                  <th className="py-3 px-4 font-medium">Sent</th>
                  <th className="py-3 px-4 font-medium">Recipients</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 px-4 text-center text-gray-500">
                      No campaigns sent yet.
                    </td>
                  </tr>
                ) : (
                  recentCampaigns.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-[#1f1f1f] last:border-b-0"
                    >
                      <td className="py-3 px-4 text-white font-medium">
                        {c.subjectLine}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {c.sentDate ? formatDate(c.sentDate) : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {(c.recipientCount ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside aria-label="Recent signups & quick actions" className="space-y-5">
          <section>
            <h2 className="text-sm uppercase tracking-[0.2em] text-gray-300 font-mono mb-3">
              Recent Signups
            </h2>
            <div className="rounded-xl border border-[#252525] bg-[#111111] overflow-hidden">
              {recentSignups.length === 0 ? (
                <p className="py-6 px-4 text-sm text-gray-500 text-center">
                  No signups yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#1f1f1f]">
                  {recentSignups.map((c) => (
                    <li key={c._id} className="py-2.5 px-4">
                      <p className="text-sm text-white truncate">{c.email}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {formatDate(c.signupDate)} · {c.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-[0.2em] text-gray-300 font-mono mb-3">
              Quick Actions
            </h2>
            <div className="rounded-xl border border-[#252525] bg-[#111111] divide-y divide-[#1f1f1f]">
              <Link
                href="/admin/marketing/compose"
                className="block px-4 py-3 text-sm text-gray-300 hover:text-teal-400 hover:bg-[#0c0c0c] transition-colors"
              >
                Write new campaign
              </Link>
              <Link
                href="/admin/marketing/contacts"
                className="block px-4 py-3 text-sm text-gray-300 hover:text-teal-400 hover:bg-[#0c0c0c] transition-colors"
              >
                Manage contacts
              </Link>
              <Link
                href="/admin/marketing/campaigns"
                className="block px-4 py-3 text-sm text-gray-300 hover:text-teal-400 hover:bg-[#0c0c0c] transition-colors"
              >
                View all campaigns
              </Link>
              <Link
                href="/admin/marketing/content-planner"
                className="block px-4 py-3 text-sm text-gray-300 hover:text-teal-400 hover:bg-[#0c0c0c] transition-colors"
              >
                Content planner
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
