import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
