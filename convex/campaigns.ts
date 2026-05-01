import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const recordSentCampaign = mutation({
  args: {
    subjectLine: v.string(),
    bodyHtml: v.string(),
    sentBy: v.string(),
    recipientCount: v.number(),
    recipientTags: v.array(v.string()),
    resendMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", { ...args, sentDate: Date.now() });
  },
});

export const listCampaigns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db.query("campaigns").order("desc").take(limit ?? 50);
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
    const sendsThisMonth = allCampaigns.filter(
      (c) => c.sentDate >= startOfMonth.getTime(),
    ).length;
    const totalRecipients = allCampaigns.reduce(
      (sum, c) => sum + c.recipientCount,
      0,
    );

    return {
      totalContacts: allContacts.length,
      activeContacts: active,
      unsubscribedContacts: unsubscribed,
      totalCampaigns: allCampaigns.length,
      sendsThisMonth,
      totalRecipients,
    };
  },
});
