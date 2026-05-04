import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// discoveryCall — admin-proposed time-slot booking that follows the full
// booking form. After the client returns the booking form (status
// `FormReturned`), the admin proposes 3-5 datetimes via `proposeSlots`. That
// reuses (or mints) the event's magic-link token and emails the client a
// link to `/c/<slug>/<token>/discovery-call`. The client picks one slot via
// `pickSlot`, which writes back to `event.discoveryCall.pickedSlot`.
//
// Token reuse mirrors `preEventSurvey.ts` and `contracts.ts` so any link the
// client has previously bookmarked still works across the booking lifecycle.
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "booking"
  );
}

function generateToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

export const proposeSlots = mutation({
  args: { id: v.id("events"), slots: v.array(v.number()) },
  returns: v.object({ token: v.string(), portalUrl: v.string() }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    if (event.family !== "ExternalBooking") {
      throw new Error("only external bookings get discovery calls");
    }
    if (!event.client?.email) throw new Error("client email required");
    if (args.slots.length === 0) {
      throw new Error("at least one slot required");
    }
    if (args.slots.length > 10) throw new Error("at most 10 slots");
    const now = Date.now();
    if (args.slots.some((s) => s <= now)) {
      throw new Error("all slots must be in the future");
    }

    // Reuse any still-valid token for this event so existing client links
    // continue to work.
    const existing = await ctx.db
      .query("bookingTokens")
      .withIndex("by_event", (q) => q.eq("eventId", args.id))
      .collect();
    const validExisting = existing.find(
      (t) => t.revokedAt === undefined && t.expiresAt > now,
    );

    let token: string;
    if (validExisting) {
      token = validExisting.token;
    } else {
      token = generateToken();
      await ctx.db.insert("bookingTokens", {
        eventId: args.id,
        token,
        mintedAt: now,
        expiresAt: now + DEFAULT_TTL_MS,
      });
    }

    const slug = slugify(event.client.name || event.name);
    const portalUrl = `https://lmeband.com/c/${slug}/${token}/discovery-call`;

    const existingDc =
      (event.discoveryCall as Record<string, unknown> | undefined) ?? {};
    await ctx.db.patch(args.id, {
      status: "DiscoveryCall",
      nextActionLabel: "Awaiting client to pick a discovery call slot",
      discoveryCall: {
        ...existingDc,
        proposedSlots: args.slots,
        proposedAt: now,
        // Reset any prior pick if the admin re-proposes new slots.
        pickedSlot: undefined,
        pickedAt: undefined,
      },
    });

    await ctx.scheduler.runAfter(
      0,
      internal.discoveryCallEmail.sendDiscoveryCallEmail,
      {
        to: event.client.email,
        clientName: event.client.name || "",
        portalUrl,
      },
    );

    return { token, portalUrl };
  },
});

export const pickSlot = mutation({
  args: { token: v.string(), slot: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tokenRow = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!tokenRow) throw new Error("invalid link");
    if (tokenRow.revokedAt !== undefined) throw new Error("link revoked");
    if (tokenRow.expiresAt <= Date.now()) throw new Error("link expired");

    const event = await ctx.db.get(tokenRow.eventId);
    if (!event) throw new Error("event not found");

    const dc = event.discoveryCall as
      | {
          proposedSlots?: number[];
          pickedSlot?: number;
          cancelledAt?: number;
        }
      | undefined;
    if (!dc?.proposedSlots) throw new Error("no slots proposed");
    if (dc.cancelledAt) throw new Error("discovery call cancelled");
    if (dc.pickedSlot !== undefined) throw new Error("already picked");
    if (!dc.proposedSlots.includes(args.slot)) {
      throw new Error("slot not in proposed list");
    }

    const now = Date.now();
    await ctx.db.patch(tokenRow.eventId, {
      nextActionLabel: "Discovery call booked — prep agenda",
      discoveryCall: {
        ...dc,
        pickedSlot: args.slot,
        pickedAt: now,
      },
    });
    return null;
  },
});

// Public read for the client portal page. Returns `null` for any
// invalid/expired/revoked token rather than throwing, keeping the page
// component simple. Mirrors `preEventSurvey.getSurveyData` and
// `contracts.getContractData`.
export const getDiscoveryCallData = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      eventName: v.string(),
      clientName: v.string(),
      proposedSlots: v.array(v.number()),
      pickedSlot: v.optional(v.number()),
      cancelled: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const tokenRow = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!tokenRow) return null;
    if (tokenRow.revokedAt !== undefined) return null;
    if (tokenRow.expiresAt <= Date.now()) return null;

    const event = await ctx.db.get(tokenRow.eventId);
    if (!event) return null;

    const dc = event.discoveryCall as
      | {
          proposedSlots?: number[];
          pickedSlot?: number;
          cancelledAt?: number;
        }
      | undefined;
    if (!dc?.proposedSlots?.length) return null;

    return {
      eventName: event.name,
      clientName: event.client?.name ?? "",
      proposedSlots: dc.proposedSlots,
      pickedSlot: dc.pickedSlot,
      cancelled: Boolean(dc.cancelledAt),
    };
  },
});
