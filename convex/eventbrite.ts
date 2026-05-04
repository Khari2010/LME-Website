"use node";

/**
 * Eventbrite integration — STUB
 *
 * P3-T7 ships the *shape* of Eventbrite ticket-sale sync so the Ticketing tab
 * works end-to-end inside the platform without live API calls.
 *
 * Activation requires:
 *   - EVENTBRITE_TOKEN env var (private OAuth token from
 *     https://www.eventbrite.com/account-settings/apps)
 *
 * Until the token is set, `syncSales` short-circuits with a console.warn and
 * writes a stub `lastSyncedAt` timestamp so the UI shows recent activity.
 *
 * Pattern matches `convex/xero.ts` — same env-gated stub approach.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function eventbriteConfigured(): boolean {
  return Boolean(process.env.EVENTBRITE_TOKEN);
}

export const syncSales = internalAction({
  args: {
    eventId: v.id("events"),
    externalEventId: v.string(),
  },
  returns: v.object({ stubbed: v.boolean(), tiersUpdated: v.number() }),
  handler: async (ctx, args) => {
    if (!eventbriteConfigured()) {
      console.warn(
        `[eventbrite stub] Would sync sales for ${args.externalEventId} on event ${args.eventId}`,
      );
      // Write a stub `lastSyncedAt` so the UI shows recent activity, even
      // though no real sale data was fetched.
      await ctx.scheduler.runAfter(
        0,
        internal.eventbriteMutations.recordSyncTimestamp,
        { eventId: args.eventId },
      );
      return { stubbed: true, tiersUpdated: 0 };
    }

    // TODO: real Eventbrite API call:
    //   GET https://www.eventbriteapi.com/v3/events/{externalEventId}/ticket_classes/
    //   Headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` }
    // Map ticket_classes → tiers → schedule
    // `internal.eventbriteMutations.updateTierSold` per tier.
    throw new Error(
      "Eventbrite is configured but the real call is not yet implemented",
    );
  },
});
