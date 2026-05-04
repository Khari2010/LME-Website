"use node";

/**
 * P2-T1: Scheduled campaign sender — runs every 5 minutes (registered in
 * `convex/crons.ts`). Picks up any campaigns whose `status === "scheduled"`
 * and `scheduledAt <= now`, then fires them through the existing
 * `campaignSender.sendCampaign` action (which patches them to `sent` via
 * `recordSentCampaign`).
 *
 * Failures for individual campaigns are logged but do not abort the loop —
 * the next tick will retry any campaign still in "scheduled" state.
 */

import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

type DueCampaign = {
  _id: Id<"campaigns">;
  subjectLine: string;
  preheader?: string;
  bodyHtml: string;
  sentBy?: string;
  recipientTags?: string[];
};

export const tick = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const due = (await ctx.runQuery(
      api.campaigns.listDueScheduled,
      {},
    )) as DueCampaign[];

    if (!due.length) {
      console.log("[scheduled-sender] no due campaigns");
      return null;
    }

    console.log(`[scheduled-sender] ${due.length} campaign(s) due`);

    for (const c of due) {
      try {
        // Hand off to the existing send pipeline. `sendCampaign` records the
        // sent state (via `recordSentCampaign`) which flips status to "sent"
        // and clears the scheduled-state semantics implicitly.
        await ctx.runAction(api.campaignSender.sendCampaign, {
          subject: c.subjectLine,
          preheader: c.preheader,
          bodyHtml: c.bodyHtml,
          sentBy: c.sentBy ?? "scheduled-cron",
          draftId: c._id,
          tags: c.recipientTags && c.recipientTags.length > 0
            ? c.recipientTags
            : undefined,
        });
        console.log(`[scheduled-sender] sent ${c._id}`);
      } catch (err) {
        console.error(`[scheduled-sender] failed for ${c._id}:`, err);
      }
    }

    return null;
  },
});
