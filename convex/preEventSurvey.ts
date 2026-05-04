import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireWrite } from "./auth";

// ---------------------------------------------------------------------------
// preEventSurvey — admin sends a "final details" magic-link after the
// deposit has been paid (status `Booked` or `PreEvent`). The client opens
// `/c/<slug>/<token>/pre-event` and submits genres they love, must-plays,
// do-not-plays, final timings, and the day-of contact. Submission writes
// back to `event.preEventSurvey` (an unstructured `v.any()` block at the
// schema layer; structure enforced by these mutations).
//
// Token reuse: if the event already has a non-revoked, non-expired token,
// we re-use it. That keeps any link the client already bookmarked working
// across the booking lifecycle (booking-form → contract → pre-event survey).
// Mirrors `contracts.sendContract`.
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

export const sendSurvey = mutation({
  args: { id: v.id("events") },
  returns: v.object({ token: v.string(), portalUrl: v.string() }),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "external-bookings");
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    if (event.family !== "ExternalBooking") {
      throw new Error("only external bookings get pre-event surveys");
    }
    if (!event.client?.email) throw new Error("client email required");
    if (event.status !== "Booked" && event.status !== "PreEvent") {
      throw new Error(
        "send survey only after deposit is paid (status Booked or PreEvent)",
      );
    }

    // Re-use any still-valid token for this event.
    const now = Date.now();
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
    const portalUrl = `https://lmeband.com/c/${slug}/${token}/pre-event`;

    const existingSurvey =
      (event.preEventSurvey as Record<string, unknown> | undefined) ?? {};

    await ctx.db.patch(args.id, {
      status: "PreEvent",
      nextActionLabel: "Awaiting client pre-event details",
      preEventSurvey: {
        ...existingSurvey,
        requestedAt: now,
      },
    });

    await ctx.scheduler.runAfter(
      0,
      internal.preEventSurveyEmail.sendPreEventSurveyEmail,
      {
        to: event.client.email,
        clientName: event.client.name || "",
        portalUrl,
      },
    );

    return { token, portalUrl };
  },
});

export const submitSurvey = mutation({
  args: {
    token: v.string(),
    genrePreferences: v.array(v.string()),
    mustPlays: v.array(v.string()),
    doNotPlays: v.array(v.string()),
    finalStartTime: v.optional(v.string()),
    finalEndTime: v.optional(v.string()),
    dayOfContactName: v.optional(v.string()),
    dayOfContactPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
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

    const now = Date.now();
    const existing =
      (event.preEventSurvey as Record<string, unknown> | undefined) ?? {};

    await ctx.db.patch(tokenRow.eventId, {
      preEventSurvey: {
        ...existing,
        submittedAt: now,
        genrePreferences: args.genrePreferences,
        mustPlays: args.mustPlays,
        doNotPlays: args.doNotPlays,
        finalStartTime: args.finalStartTime,
        finalEndTime: args.finalEndTime,
        dayOfContactName: args.dayOfContactName,
        dayOfContactPhone: args.dayOfContactPhone,
        notes: args.notes,
      },
    });
    return null;
  },
});

// Public read for the client portal page. Returns `null` for any
// invalid/expired/revoked token rather than throwing — keeps the page
// component simple ("if !data → show error UI"). Mirrors the read pattern in
// `contracts.getContractData`.
export const getSurveyData = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      eventId: v.id("events"),
      eventName: v.string(),
      eventDate: v.number(),
      venue: v.optional(v.string()),
      clientName: v.string(),
      submittedAt: v.optional(v.number()),
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

    const survey = event.preEventSurvey as
      | { submittedAt?: number }
      | undefined;

    return {
      eventId: tokenRow.eventId,
      eventName: event.name,
      eventDate: event.startDate,
      venue: event.venue?.name,
      clientName: event.client?.name ?? "",
      submittedAt: survey?.submittedAt,
    };
  },
});
