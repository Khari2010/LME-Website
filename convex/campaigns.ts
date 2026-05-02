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

    return {
      totalContacts: allContacts.length,
      activeContacts: active,
      unsubscribedContacts: unsubscribed,
      totalCampaigns: sentCampaigns.length,
      sendsThisMonth,
      totalRecipients,
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
