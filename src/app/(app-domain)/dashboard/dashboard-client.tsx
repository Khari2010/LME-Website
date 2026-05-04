"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { roleLabel, type Role } from "@/lib/role-permissions";
import { Stat } from "@/components/crm/Stat";
import { Sparkline } from "@/components/crm/Sparkline";

type DashboardRole = Role | "no-access";

export function DashboardClient({ role }: { role: string }) {
  const r = role as DashboardRole;
  const externalBookings = useQuery(api.events.listByFamily, { family: "ExternalBooking" });

  if (r === "no-access") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <div className="bg-bg-surface border border-border-crm rounded p-4">
          <p className="text-text-body">
            Your account is being set up. If this persists, contact an admin.
          </p>
        </div>
      </div>
    );
  }

  const isDirector = r === "director" || r === "owner";
  const isAdminLike = r === "admin" || r === "drafter" || isDirector;
  const isInternalEvents = r === "internal-events";
  const isMarketing = r === "marketing";
  const isProduction = r === "production";
  const isTicketing = r === "ticketing";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="text-sm text-text-muted">Role: {roleLabel(r)}</p>

      {/* Analytics — top of dashboard, role-aware */}
      {isAdminLike && <DirectorStats />}
      {isMarketing && <MarketingStats />}
      {isInternalEvents && <InternalEventsStats />}
      {isTicketing && <TicketingStats />}

      {/* Bookings pipeline — director / admin / owner */}
      {isAdminLike && (
        <section className="bg-bg-surface border border-border-crm rounded p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Bookings pipeline</h2>
          {externalBookings === undefined ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {externalBookings.map((e) => (
                <li key={e._id} className="text-sm">
                  <Link href={`/events/${e._id}`} className="hover:underline text-accent">
                    {e.name} — {e.status}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/events/external-bookings"
            className="text-sm text-accent mt-2 inline-block"
          >
            View pipeline →
          </Link>
        </section>
      )}

      {/* Production role — crew assignments */}
      {isProduction && (
        <section className="bg-bg-surface border border-border-crm rounded p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-2">My production crew</h2>
          <p className="text-sm text-text-muted">
            Internal Shows where you're assigned to the production crew (coming soon).
          </p>
        </section>
      )}
    </div>
  );
}

function DirectorStats() {
  const revenue = useQuery(api.analytics.getQuarterlyRevenue, { quarters: 4 });
  const pipeline = useQuery(api.analytics.getPipelineConversion, { windowDays: 90 });
  const campaigns = useQuery(api.analytics.getCampaignSummary, { limit: 5 });
  const fans = useQuery(api.analytics.getFanGrowth, { months: 6 });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat
        label="Revenue (4 qtrs)"
        value={
          revenue
            ? `£${revenue.reduce((s, q) => s + q.revenue, 0).toLocaleString()}`
            : "…"
        }
        trend={revenue && <Sparkline values={revenue.map((q) => q.revenue)} />}
        tone="positive"
      />
      <Stat
        label="Pipeline (90d)"
        value={pipeline ? `${Math.round(pipeline.conversionRate * 100)}% closed` : "…"}
        sub={
          pipeline
            ? `${pipeline.inquiry} inquiry · ${pipeline.booked} booked · ${pipeline.completed} done`
            : undefined
        }
      />
      <Stat
        label="Campaigns"
        value={campaigns ? `${Math.round(campaigns.openRate * 100)}% opens` : "…"}
        sub={
          campaigns
            ? `${campaigns.totalSent} sent · ${Math.round(campaigns.clickRate * 100)}% clicks`
            : undefined
        }
      />
      <Stat
        label="Fan growth"
        value={fans ? fans.totalActive.toLocaleString() : "…"}
        trend={fans && <Sparkline values={fans.series.map((s) => s.cumulative)} />}
        sub={fans ? `last 6 months` : undefined}
      />
    </div>
  );
}

function MarketingStats() {
  const campaigns = useQuery(api.analytics.getCampaignSummary, { limit: 10 });
  const fans = useQuery(api.analytics.getFanGrowth, { months: 12 });

  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat
        label="Open rate (last 10 sends)"
        value={campaigns ? `${Math.round(campaigns.openRate * 100)}%` : "…"}
        sub={
          campaigns
            ? `${campaigns.deliveredCount} delivered · ${campaigns.bouncedCount} bounced`
            : undefined
        }
      />
      <Stat
        label="Active fans"
        value={fans ? fans.totalActive.toLocaleString() : "…"}
        trend={fans && <Sparkline values={fans.series.map((s) => s.cumulative)} />}
        sub="12 months"
      />
    </div>
  );
}

function InternalEventsStats() {
  const revenue = useQuery(api.analytics.getQuarterlyRevenue, { quarters: 4 });

  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat
        label="Revenue (4 qtrs)"
        value={
          revenue
            ? `£${revenue.reduce((s, q) => s + q.revenue, 0).toLocaleString()}`
            : "…"
        }
        tone="positive"
      />
      <Stat label="Internal Shows" value="View pipeline →" sub="link in sidebar" />
    </div>
  );
}

function TicketingStats() {
  return (
    <div className="bg-bg-surface border border-border-crm rounded p-4">
      <p className="text-text-body">Ticketing dashboard rolling up shortly.</p>
      <p className="text-sm text-text-muted mt-1">
        For now, see{" "}
        <Link href="/events/internal-shows" className="text-accent hover:text-accent-hover">
          Internal Shows
        </Link>{" "}
        to drill into per-show ticket sales.
      </p>
    </div>
  );
}
