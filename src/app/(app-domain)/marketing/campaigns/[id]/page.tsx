import { fetchQuery } from "@/lib/convex/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import CampaignBody from "@/components/admin/CampaignBody";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaignId = id as Id<"campaigns">;
  const campaign = await fetchQuery(api.campaigns.getCampaign, {
    id: campaignId,
  });
  if (!campaign) notFound();

  const isDraft = campaign.status === "draft";
  const recipientCount = campaign.recipientCount ?? 0;
  const showMetrics = !isDraft && recipientCount > 0;
  const metrics = showMetrics
    ? await fetchQuery(api.campaigns.getCampaignMetrics, { campaignId })
    : null;

  return (
    <div className="space-y-6 text-text-primary">
      <Link
        href="/marketing/campaigns"
        className="inline-flex items-center gap-2 text-accent hover:text-accent-hover text-xs uppercase tracking-widest transition"
      >
        <span aria-hidden="true">←</span> Back to campaigns
      </Link>

      <header>
        <p className="text-xs uppercase tracking-widest text-accent">
          LME · Marketing
        </p>
        <h1 className="text-3xl font-bold mt-1">{campaign.subjectLine}</h1>
        {campaign.preheader ? (
          <p className="text-text-muted text-sm mt-1">{campaign.preheader}</p>
        ) : null}
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Status"
          value={isDraft ? "Draft" : "Sent"}
          accent={isDraft ? "amber" : "accent"}
        />
        <Stat
          label="Sent date"
          value={
            campaign.sentDate
              ? new Date(campaign.sentDate).toLocaleString()
              : "—"
          }
        />
        <Stat
          label="Recipients"
          value={campaign.recipientCount?.toLocaleString() ?? "—"}
        />
        <Stat
          label="Tags"
          value={
            campaign.recipientTags && campaign.recipientTags.length > 0
              ? campaign.recipientTags.join(", ")
              : "All active"
          }
        />
      </div>

      {/* Engagement metrics — only shown for sent campaigns with recipients. */}
      {showMetrics && metrics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="Delivered"
            value={`${metrics.delivered.toLocaleString()} (${formatPct(
              metrics.delivered,
              recipientCount,
            )})`}
          />
          <Stat
            label="Opened"
            value={`${metrics.opened.toLocaleString()} (${formatPct(
              metrics.opened,
              metrics.delivered || recipientCount,
            )})`}
          />
          <Stat
            label="Clicked"
            value={`${metrics.clicked.toLocaleString()} (${formatPct(
              metrics.clicked,
              metrics.delivered || recipientCount,
            )})`}
          />
          <Stat
            label="Bounced"
            value={`${metrics.bounced.toLocaleString()} (${formatPct(
              metrics.bounced,
              recipientCount,
            )})`}
            accent={metrics.bounced > 0 ? "amber" : undefined}
          />
        </div>
      ) : null}

      {/* Body preview */}
      <section className="bg-bg-surface border border-border-crm rounded-xl p-6 space-y-3">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-widest text-text-muted">
            Email body
          </h2>
          {isDraft ? (
            <Link
              href={`/marketing/compose?draft=${campaign._id}`}
              className="bg-accent-hover text-bg-base uppercase tracking-wider font-bold text-xs px-4 py-2 rounded hover:bg-accent transition"
            >
              Open in composer
            </Link>
          ) : null}
        </header>
        <CampaignBody html={campaign.bodyHtml} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "accent";
}) {
  const tone =
    accent === "amber"
      ? "text-amber-500"
      : accent === "accent"
        ? "text-accent"
        : "text-text-primary";
  return (
    <div className="bg-bg-surface border border-border-crm rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-widest text-text-muted font-mono">
        {label}
      </p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

function formatPct(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return "—";
  const pct = (numerator / denominator) * 100;
  return `${pct.toFixed(pct >= 10 ? 0 : 1)}%`;
}
