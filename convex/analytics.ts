import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Quarterly revenue — last N quarters, ms timestamps + cash totals.
 * Reuses the same logic as finance.getCashflowSummary but returns just revenue
 * (not net) so it can be sparklined.
 */
export const getQuarterlyRevenue = query({
  args: { quarters: v.optional(v.number()) },
  returns: v.array(
    v.object({
      label: v.string(),
      revenue: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const quarterCount = args.quarters ?? 4;
    const now = new Date();
    const out: Array<{ label: string; revenue: number }> = [];
    let year = now.getFullYear();
    let q = Math.floor(now.getMonth() / 3);

    const events = await ctx.db.query("events").collect();
    const acc: Array<{ label: string; startMs: number; endMs: number }> = [];
    for (let i = 0; i < quarterCount; i++) {
      const startMonth = q * 3;
      const start = new Date(year, startMonth, 1).getTime();
      const end = new Date(year, startMonth + 3, 1).getTime();
      acc.unshift({ label: `Q${q + 1} ${year}`, startMs: start, endMs: end });
      q -= 1;
      if (q < 0) {
        q = 3;
        year -= 1;
      }
    }
    for (const qr of acc) {
      let revenue = 0;
      for (const e of events) {
        const f = e.finance;
        if (!f) continue;
        if (
          f.deposit?.paid &&
          f.deposit.paidAt !== undefined &&
          f.deposit.paidAt >= qr.startMs &&
          f.deposit.paidAt < qr.endMs
        ) {
          revenue += f.deposit.amount;
        }
        if (
          f.balance?.paid &&
          f.balance.paidAt !== undefined &&
          f.balance.paidAt >= qr.startMs &&
          f.balance.paidAt < qr.endMs
        ) {
          revenue += f.balance.amount;
        }
      }
      out.push({ label: qr.label, revenue });
    }
    return out;
  },
});

/**
 * Pipeline conversion — count of events at each external-booking pipeline
 * stage in the last `windowDays` (default 90).
 */
export const getPipelineConversion = query({
  args: { windowDays: v.optional(v.number()) },
  returns: v.object({
    inquiry: v.number(),
    booked: v.number(),
    completed: v.number(),
    lost: v.number(),
    conversionRate: v.number(),
  }),
  handler: async (ctx, args) => {
    const window = (args.windowDays ?? 90) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - window;
    const events = await ctx.db
      .query("events")
      .withIndex("by_family_and_date", (q) => q.eq("family", "ExternalBooking"))
      .collect();
    const recent = events.filter((e) => e._creationTime >= cutoff);

    let inquiry = 0;
    let booked = 0;
    let completed = 0;
    let lost = 0;
    for (const e of recent) {
      const s = e.status;
      if (
        s === "Inquiry" ||
        s === "InitialReview" ||
        s === "BookingFormSent" ||
        s === "FormReturned" ||
        s === "DiscoveryCall" ||
        s === "Quoting"
      ) {
        inquiry++;
      } else if (
        s === "ContractSent" ||
        s === "ContractSigned" ||
        s === "AwaitingDeposit" ||
        s === "Booked" ||
        s === "PreEvent" ||
        s === "EventDay" ||
        s === "AwaitingBalance"
      ) {
        booked++;
      } else if (s === "Completed") {
        completed++;
      } else if (s === "Cancelled" || s === "Lost") {
        lost++;
      }
    }
    const total = recent.length;
    const closed = booked + completed;
    return {
      inquiry,
      booked,
      completed,
      lost,
      conversionRate: total > 0 ? closed / total : 0,
    };
  },
});

/**
 * Campaign summary — last N campaigns sent, with delivered/opened/clicked
 * counts pulled from campaignEvents.
 */
export const getCampaignSummary = query({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    totalSent: v.number(),
    deliveredCount: v.number(),
    openedCount: v.number(),
    clickedCount: v.number(),
    bouncedCount: v.number(),
    openRate: v.number(),
    clickRate: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const sentCampaigns = await ctx.db
      .query("campaigns")
      .filter((q) => q.eq(q.field("status"), "sent"))
      .order("desc")
      .take(limit);

    let totalSent = 0;
    for (const c of sentCampaigns) totalSent += c.recipientCount ?? 0;

    const allEvents = await ctx.db.query("campaignEvents").collect();
    const ids = new Set(sentCampaigns.map((c) => c._id));
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    for (const ev of allEvents) {
      if (!ids.has(ev.campaignId)) continue;
      if (ev.type === "delivered") delivered++;
      else if (ev.type === "opened") opened++;
      else if (ev.type === "clicked") clicked++;
      else if (ev.type === "bounced") bounced++;
    }
    return {
      totalSent,
      deliveredCount: delivered,
      openedCount: opened,
      clickedCount: clicked,
      bouncedCount: bounced,
      openRate: delivered > 0 ? opened / delivered : 0,
      clickRate: opened > 0 ? clicked / opened : 0,
    };
  },
});

/**
 * Fan growth — number of contacts (status=active, source=enhancers-signup) per
 * month for the last N months (default 6).
 */
export const getFanGrowth = query({
  args: { months: v.optional(v.number()) },
  returns: v.object({
    totalActive: v.number(),
    series: v.array(
      v.object({
        label: v.string(),
        newSignups: v.number(),
        cumulative: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const months = args.months ?? 6;
    const now = new Date();
    const buckets: Array<{
      label: string;
      startMs: number;
      endMs: number;
      newSignups: number;
    }> = [];
    let year = now.getFullYear();
    let m = now.getMonth();
    for (let i = 0; i < months; i++) {
      const start = new Date(year, m, 1).getTime();
      const end = new Date(year, m + 1, 1).getTime();
      buckets.unshift({
        label: new Date(start).toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        startMs: start,
        endMs: end,
        newSignups: 0,
      });
      m -= 1;
      if (m < 0) {
        m = 11;
        year -= 1;
      }
    }

    const contacts = await ctx.db.query("contacts").collect();
    const active = contacts.filter(
      (c) => c.status === "active" && c.source === "enhancers-signup",
    );
    for (const c of active) {
      for (const b of buckets) {
        if (c.signupDate >= b.startMs && c.signupDate < b.endMs) {
          b.newSignups++;
          break;
        }
      }
    }

    // Cumulative — start at "active count BEFORE the first bucket" and add per-bucket
    const baseline = active.filter(
      (c) => c.signupDate < buckets[0].startMs,
    ).length;
    let running = baseline;
    const series = buckets.map((b) => {
      running += b.newSignups;
      return {
        label: b.label,
        newSignups: b.newSignups,
        cumulative: running,
      };
    });

    return { totalActive: active.length, series };
  },
});

/**
 * Ticket sales velocity for an Internal Show — sold/capacity ratio.
 */
export const getTicketVelocity = query({
  args: { eventId: v.id("events") },
  returns: v.union(
    v.null(),
    v.object({
      sold: v.number(),
      capacity: v.number(),
      pctSold: v.number(),
      daysUntilEvent: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || !event.ticketing) return null;
    const tiers = event.ticketing.tiers ?? [];
    const sold = tiers.reduce((s, t) => s + t.sold, 0);
    const capacity = tiers.reduce((s, t) => s + t.capacity, 0);
    const daysUntilEvent = Math.ceil(
      (event.startDate - Date.now()) / (24 * 60 * 60 * 1000),
    );
    return {
      sold,
      capacity,
      pctSold: capacity > 0 ? sold / capacity : 0,
      daysUntilEvent,
    };
  },
});
