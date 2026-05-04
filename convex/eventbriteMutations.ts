import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// eventbriteMutations — V8-runtime DB-write helpers for the Eventbrite action
// layer. Same split as xeroMutations.ts: `convex/eventbrite.ts` runs under
// `"use node"` and cannot expose `internalMutation` directly (mutations must
// be V8 deterministic), so the action schedules these helpers to write back.
//
// `recordSyncTimestamp` — bump `ticketing.lastSyncedAt`, leaving everything
// else untouched. Useful as a stub side-effect when the real Eventbrite call
// isn't wired up yet.
//
// `updateTierSold` — patch `sold` for one tier (matched by `name`). When the
// real Eventbrite call lands, we'll fan one of these out per ticket_class.
// ---------------------------------------------------------------------------

type TicketingTier = {
  name: string;
  price: number;
  capacity: number;
  sold: number;
};

type VoucherCode = {
  code: string;
  discount: number;
  usedCount: number;
  maxUses?: number;
};

type TicketingBlock = {
  platform?: "Eventbrite" | "Skiddle" | "None";
  externalEventId?: string;
  tiers?: TicketingTier[];
  voucherCodes?: VoucherCode[];
  lastSyncedAt?: number;
};

export const recordSyncTimestamp = internalMutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const t = (event.ticketing ?? {
      platform: "None",
      tiers: [],
    }) as TicketingBlock;
    await ctx.db.patch(args.eventId, {
      ticketing: {
        platform: t.platform ?? "None",
        externalEventId: t.externalEventId,
        tiers: t.tiers ?? [],
        voucherCodes: t.voucherCodes,
        lastSyncedAt: Date.now(),
      },
    });
    return null;
  },
});

export const updateTierSold = internalMutation({
  args: {
    eventId: v.id("events"),
    tierName: v.string(),
    sold: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || !event.ticketing) return null;
    const t = event.ticketing as TicketingBlock;
    const updatedTiers = (t.tiers ?? []).map((tier) =>
      tier.name === args.tierName ? { ...tier, sold: args.sold } : tier,
    );
    await ctx.db.patch(args.eventId, {
      ticketing: {
        platform: t.platform ?? "None",
        externalEventId: t.externalEventId,
        tiers: updatedTiers,
        voucherCodes: t.voucherCodes,
        lastSyncedAt: Date.now(),
      },
    });
    return null;
  },
});
