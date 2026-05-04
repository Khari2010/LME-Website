import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireWrite, requireAuth } from "./auth";

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

// PUBLIC by design — called by the Resend webhook handler in
// `src/app/api/resend/webhook/route.ts` which lives outside Convex's auth
// surface but signs each request via Svix HMAC (P7 fix). Leaking the
// existence of a campaign by its opaque Resend message ID is not exploitable.
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

// PUBLIC by design — called from the Resend webhook handler which
// signature-verifies each delivery using Svix HMAC before invoking this
// mutation (see `src/app/api/resend/webhook/route.ts`).
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
    const eventId = await ctx.db.insert("campaignEvents", args);

    // P2-T2: auto-suppress contacts that hard-bounce or complain. We only
    // act on hard bounces (Resend reports `bounce.type === "Hard"` for these);
    // soft bounces are transient and shouldn't suppress the address.
    if (args.type === "bounced") {
      const data = args.data as { bounce?: { type?: string; message?: string } } | undefined;
      const bounceType = data?.bounce?.type?.toLowerCase();
      if (bounceType === "hard") {
        await ctx.runMutation(internal.contacts.markBouncedByEmail, {
          email: args.recipientEmail.toLowerCase(),
          reason: data?.bounce?.message,
        });
      }
    } else if (args.type === "complained") {
      await ctx.runMutation(internal.contacts.markComplainedByEmail, {
        email: args.recipientEmail.toLowerCase(),
      });
    }

    return eventId;
  },
});

export const getCampaignMetrics = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireAuth(ctx);
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
      if (existing.status === "scheduled")
        throw new Error(
          "Cannot edit a scheduled campaign — cancel the schedule first",
        );
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
    await requireAuth(ctx);
    const c = await ctx.db.get(id);
    if (!c) return null;
    return c;
  },
});

export const getCampaign = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    return await ctx.db.get(id);
  },
});

export const getCampaignInternal = internalQuery({
  args: { id: v.id("campaigns") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const recordCampaignEventInternal = internalMutation({
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("campaignEvents", { ...args });
  },
});

export const listCampaigns = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("sent"),
      ),
    ),
  },
  handler: async (ctx, { limit, status }) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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

/**
 * P2-T1: schedule a draft campaign to send at a future timestamp.
 * Flips status from "draft" → "scheduled" and stores `scheduledAt` + tags.
 * The 5-minute cron in `convex/scheduledSenderAction.ts` picks it up.
 */
export const scheduleSend = mutation({
  args: {
    draftId: v.id("campaigns"),
    scheduledAt: v.number(),
    recipientTags: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "marketing");
    if (args.scheduledAt <= Date.now())
      throw new Error("scheduledAt must be in the future");
    const existing = await ctx.db.get(args.draftId);
    if (!existing) throw new Error("draft not found");
    if (existing.status === "sent")
      throw new Error("campaign already sent");
    await ctx.db.patch(args.draftId, {
      status: "scheduled",
      scheduledAt: args.scheduledAt,
      recipientTags: args.recipientTags,
    });
    return null;
  },
});

/** Reverts a scheduled campaign back to draft state. */
export const cancelSchedule = mutation({
  args: { id: v.id("campaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "marketing");
    const c = await ctx.db.get(args.id);
    if (!c) throw new Error("campaign not found");
    if (c.status !== "scheduled")
      throw new Error("only scheduled campaigns can be cancelled");
    await ctx.db.patch(args.id, { status: "draft", scheduledAt: undefined });
    return null;
  },
});

/**
 * P7 bug-hunt fix: claim a scheduled campaign for sending in a single
 * transaction. The cron tick calls this BEFORE handing the campaign to
 * `campaignSender.sendCampaign`. If the row is already claimed (status not
 * "scheduled"), the cron skips it — preventing double-sends if a previous
 * tick is still in flight or a Resend retry happens to overlap.
 *
 * On successful send, `recordSentCampaign` flips status to "sent".
 * On failure, the campaign is left in "draft" with no `scheduledAt` — admin
 * must explicitly reschedule.
 */
export const claimScheduledForSend = mutation({
  args: { id: v.id("campaigns") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.id);
    if (!c) return false;
    if (c.status !== "scheduled") return false;
    // The schema's `status` union doesn't include "sending"; flipping to
    // "draft" + clearing `scheduledAt` achieves the same lock-out (the next
    // cron tick won't see this row in `listDueScheduled`).
    await ctx.db.patch(args.id, { status: "draft", scheduledAt: undefined });
    return true;
  },
});

/**
 * Returns scheduled campaigns whose `scheduledAt` is in the past (i.e. due
 * to send). Called by the 5-minute cron tick via the internal API so the
 * cron context (no Clerk identity) can read without tripping the auth gate.
 */
export const listDueScheduled = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("campaigns")
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
    return rows.filter((r) => r.scheduledAt != null && r.scheduledAt <= now);
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
