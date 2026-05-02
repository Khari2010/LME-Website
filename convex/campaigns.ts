import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const recordSentCampaign = mutation({
  args: {
    draftId: v.optional(v.id("campaigns")),
    subjectLine: v.string(),
    preheader: v.optional(v.string()),
    bodyHtml: v.string(),
    sentBy: v.string(),
    recipientCount: v.number(),
    recipientTags: v.array(v.string()),
    resendMessageId: v.optional(v.string()),
    resendBatchIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { draftId, ...rest } = args;
    const sentDate = Date.now();
    if (draftId) {
      const existing = await ctx.db.get(draftId);
      if (!existing) throw new Error("Draft not found");
      await ctx.db.patch(draftId, {
        status: "sent",
        subjectLine: rest.subjectLine,
        preheader: rest.preheader,
        bodyHtml: rest.bodyHtml,
        sentBy: rest.sentBy,
        recipientCount: rest.recipientCount,
        recipientTags: rest.recipientTags,
        resendMessageId: rest.resendMessageId,
        resendBatchIds: rest.resendBatchIds,
        sentDate,
      });
      return draftId;
    }
    return await ctx.db.insert("campaigns", {
      status: "sent",
      ...rest,
      sentDate,
    });
  },
});

export const findCampaignByMessageId = query({
  args: { resendMessageId: v.string() },
  handler: async (ctx, { resendMessageId }) => {
    const all = await ctx.db.query("campaigns").collect();
    return (
      all.find(
        (c) =>
          c.resendBatchIds?.includes(resendMessageId) ||
          c.resendMessageId === resendMessageId,
      ) ?? null
    );
  },
});

export const recordCampaignEvent = mutation({
  args: {
    campaignId: v.id("campaigns"),
    resendMessageId: v.string(),
    recipientEmail: v.string(),
    type: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("delivery_delayed"),
    ),
    occurredAt: v.number(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaignEvents", args);
  },
});

export const getCampaignMetrics = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const events = await ctx.db
      .query("campaignEvents")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();
    const counts = {
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
    };
    const uniqueOpens = new Set<string>();
    const uniqueClicks = new Set<string>();
    for (const e of events) {
      if (e.type === "delivered") counts.delivered++;
      if (e.type === "opened") {
        if (!uniqueOpens.has(e.recipientEmail)) {
          counts.opened++;
          uniqueOpens.add(e.recipientEmail);
        }
      }
      if (e.type === "clicked") {
        if (!uniqueClicks.has(e.recipientEmail)) {
          counts.clicked++;
          uniqueClicks.add(e.recipientEmail);
        }
      }
      if (e.type === "bounced") counts.bounced++;
      if (e.type === "complained") counts.complained++;
    }
    return counts;
  },
});

export const saveDraft = mutation({
  args: {
    draftId: v.optional(v.id("campaigns")),
    subject: v.string(),
    preheader: v.optional(v.string()),
    bodyHtml: v.string(),
    sentBy: v.string(),
  },
  handler: async (ctx, { draftId, subject, preheader, bodyHtml, sentBy }) => {
    if (draftId) {
      const existing = await ctx.db.get(draftId);
      if (!existing) throw new Error("Draft not found");
      if (existing.status === "sent")
        throw new Error("Cannot edit a sent campaign");
      await ctx.db.patch(draftId, {
        subjectLine: subject,
        preheader,
        bodyHtml,
      });
      return { id: draftId };
    }
    const id = await ctx.db.insert("campaigns", {
      status: "draft",
      subjectLine: subject,
      preheader,
      bodyHtml,
      sentBy,
    });
    return { id };
  },
});

export const getDraft = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    const c = await ctx.db.get(id);
    if (!c) return null;
    return c;
  },
});

export const getCampaign = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const listCampaigns = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"))),
  },
  handler: async (ctx, { limit, status }) => {
    const list = status
      ? await ctx.db
          .query("campaigns")
          .filter((q) => q.eq(q.field("status"), status))
          .order("desc")
          .take(limit ?? 50)
      : await ctx.db.query("campaigns").order("desc").take(limit ?? 50);
    return list;
  },
});

export const getMarketingStats = query({
  args: {},
  handler: async (ctx) => {
    const allContacts = await ctx.db.query("contacts").collect();
    const active = allContacts.filter((c) => c.status === "active").length;
    const unsubscribed = allContacts.filter(
      (c) => c.status === "unsubscribed",
    ).length;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const allCampaigns = await ctx.db.query("campaigns").collect();
    const sentCampaigns = allCampaigns.filter((c) => c.status === "sent");
    const sendsThisMonth = sentCampaigns.filter(
      (c) => (c.sentDate ?? 0) >= startOfMonth.getTime(),
    ).length;
    const totalRecipients = sentCampaigns.reduce(
      (sum, c) => sum + (c.recipientCount ?? 0),
      0,
    );

    // Aggregate open/click rates across all tracked campaigns. Counts unique
    // opens/clicks per (campaign, recipient) so reloads don't inflate totals.
    let totalDelivered = 0;
    const uniqueOpenKeys = new Set<string>();
    const uniqueClickKeys = new Set<string>();
    const allEvents = await ctx.db.query("campaignEvents").collect();
    for (const e of allEvents) {
      if (e.type === "delivered") totalDelivered++;
      if (e.type === "opened") uniqueOpenKeys.add(`${e.campaignId}:${e.recipientEmail}`);
      if (e.type === "clicked") uniqueClickKeys.add(`${e.campaignId}:${e.recipientEmail}`);
    }
    const totalOpens = uniqueOpenKeys.size;
    const totalClicks = uniqueClickKeys.size;

    return {
      totalContacts: allContacts.length,
      activeContacts: active,
      unsubscribedContacts: unsubscribed,
      totalCampaigns: sentCampaigns.length,
      sendsThisMonth,
      totalRecipients,
      totalDelivered,
      totalOpens,
      totalClicks,
      avgOpenRate: totalDelivered > 0 ? totalOpens / totalDelivered : 0,
      avgClickRate: totalDelivered > 0 ? totalClicks / totalDelivered : 0,
    };
  },
});

export const backfillCampaignStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("campaigns").collect();
    let patched = 0;
    for (const c of all) {
      // Existing rows shouldn't have `status` set (added in this migration).
      // The runtime field-presence check works regardless of TS typing.
      const row = c as unknown as { status?: "draft" | "sent" };
      if (!row.status) {
        await ctx.db.patch(c._id, { status: "sent" });
        patched++;
      }
    }
    return { patched, total: all.length };
  },
});
