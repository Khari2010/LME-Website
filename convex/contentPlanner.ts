import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";

// P2-T5: Content Planner — cross-source marketing timeline.
//
// Aggregates standalone campaigns (status: scheduled, sent) and per-engagement
// marketing posts (events.marketingPlan.weeks[].posts[]) into a single feed of
// dated entries. Drafts (campaigns with no scheduledAt) are returned by the
// separate `listDrafts` query so the planner can surface them in a sidebar.
//
// MVP note: events table is small (<500 rows expected); we read all rows and
// filter in memory. If scale grows past ~1000, add a date-indexed query.

export type PlannerEntry = {
  id: string;
  source: "campaign" | "engagement-post";
  date: number | null; // null = unscheduled drafts (currently filtered out here)
  status: "draft" | "scheduled" | "sent";
  title: string;
  subtitle?: string;
  href?: string;
};

export const listEntries = query({
  args: { from: v.number(), to: v.number() },
  returns: v.array(
    v.object({
      id: v.string(),
      source: v.union(v.literal("campaign"), v.literal("engagement-post")),
      date: v.union(v.number(), v.null()),
      status: v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("sent"),
      ),
      title: v.string(),
      subtitle: v.optional(v.string()),
      href: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const out: Array<{
      id: string;
      source: "campaign" | "engagement-post";
      date: number | null;
      status: "draft" | "scheduled" | "sent";
      title: string;
      subtitle?: string;
      href?: string;
    }> = [];

    // 1. Standalone campaigns — only sent + scheduled show on the calendar.
    const campaigns = await ctx.db.query("campaigns").collect();
    for (const c of campaigns) {
      if (c.status === "draft") continue; // drafts surfaced via listDrafts
      let date: number | null;
      if (c.status === "sent") date = c.sentDate ?? null;
      else if (c.status === "scheduled") date = c.scheduledAt ?? null;
      else date = null;
      // Skip rows without a date or outside the requested window.
      if (date == null) continue;
      if (date < args.from || date >= args.to) continue;
      out.push({
        id: c._id,
        source: "campaign",
        date,
        status: c.status as "draft" | "scheduled" | "sent",
        title: c.subjectLine || "Untitled campaign",
        subtitle:
          c.recipientTags && c.recipientTags.length > 0
            ? `Tags: ${c.recipientTags.join(", ")}`
            : undefined,
        href: `/admin/marketing/compose?id=${c._id}`,
      });
    }

    // 2. Per-engagement marketing posts (Phase 3+ data; usually empty today).
    const events = await ctx.db.query("events").collect();
    for (const e of events) {
      const plan =
        (e.marketingPlan as
          | {
              weeks?: Array<{
                weekIndex: number;
                theme?: string;
                posts?: Array<{
                  platform: string;
                  copy: string;
                  scheduledAt?: number;
                  sent: boolean;
                }>;
              }>;
            }
          | undefined) ?? undefined;
      if (!plan?.weeks) continue;
      for (const week of plan.weeks) {
        for (const post of week.posts ?? []) {
          const date = post.scheduledAt ?? null;
          if (date == null) continue; // skip unscheduled posts in MVP planner
          if (date < args.from || date >= args.to) continue;
          out.push({
            id: `${e._id}:${week.weekIndex}:${post.platform}:${date}`,
            source: "engagement-post",
            date,
            status: post.sent ? "sent" : "scheduled",
            title: `${post.platform}: ${post.copy.slice(0, 60)}${post.copy.length > 60 ? "…" : ""}`,
            subtitle: `${e.name} · ${week.theme ?? `Week ${week.weekIndex}`}`,
            href: `/admin/events/${e._id}/marketing`,
          });
        }
      }
    }

    return out;
  },
});

// Drafts have no scheduledAt and don't fit a date-range query — surfaced
// separately as a sidebar list under the calendar.
export const listDrafts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("campaigns"),
      _creationTime: v.number(),
      subjectLine: v.string(),
      preheader: v.optional(v.string()),
      status: v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("sent"),
      ),
    }),
  ),
  handler: async (ctx) => {
    await requireAuth(ctx);
    const drafts = await ctx.db
      .query("campaigns")
      .filter((q) => q.eq(q.field("status"), "draft"))
      .order("desc")
      .collect();
    return drafts.map((d) => ({
      _id: d._id,
      _creationTime: d._creationTime,
      subjectLine: d.subjectLine,
      preheader: d.preheader,
      status: d.status,
    }));
  },
});
