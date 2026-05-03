import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// bookingForm — admin-triggered "send full booking form" mutation.
//
// After a public inquiry comes in (status=Inquiry), an admin reviews the
// event on `/events/[id]` and clicks "Send full booking form". That action
// calls `sendFullForm` here, which:
//   1. Mints a fresh `bookingTokens` row scoped to the event
//   2. Schedules an email to `event.client.email` with the magic-link URL
//   3. Advances `event.status` to `BookingFormSent` + sets the next-action
//      label so the dashboard reflects what we're waiting on
//
// We mint the token inline (rather than via `internal.bookingTokens.mintForEvent`)
// because that helper is an `internalMutation` and Convex doesn't allow calling
// one mutation from another. The minting logic mirrors the helper exactly.
// ---------------------------------------------------------------------------

// Default TTL for a fresh booking token: 6 months. Booking lifecycles span
// from initial inquiry through to post-event survey. Mirrors the constant in
// `convex/bookingTokens.ts`.
const DEFAULT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// URL-safe slug derived from the client name (or event name as fallback).
// Used purely as a human-readable hint in the portal URL — the token is what
// actually authorises access. Capped at 60 chars to keep links short.
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "booking"
  );
}

// Generate the same 64-hex-char token format as `bookingTokens.mintForEvent`.
function generateToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

export const sendFullForm = mutation({
  args: { id: v.id("events") },
  returns: v.object({ token: v.string(), portalUrl: v.string() }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    if (event.family !== "ExternalBooking") {
      throw new Error("only external bookings can have a client form");
    }
    if (!event.client?.email) {
      throw new Error("client email required");
    }

    // Mint a 6-month token directly (avoids the action-from-mutation pattern).
    const now = Date.now();
    const token = generateToken();
    const expiresAt = now + DEFAULT_TTL_MS;
    await ctx.db.insert("bookingTokens", {
      eventId: args.id,
      token,
      mintedAt: now,
      expiresAt,
    });

    const slug = slugify(event.client.name || event.name);
    const portalUrl = `https://lmeband.com/c/${slug}/${token}/booking-form`;

    // Advance status + next-action so the admin dashboard reflects state.
    await ctx.db.patch(args.id, {
      status: "BookingFormSent",
      nextActionLabel: "Awaiting client to submit booking form",
    });

    // Send the email asynchronously — keeps the mutation fast and lets the
    // Node-runtime action handle Resend.
    await ctx.scheduler.runAfter(
      0,
      internal.bookingFormEmail.sendBookingFormEmail,
      {
        to: event.client.email,
        clientName: event.client.name || "",
        portalUrl,
      },
    );

    return { token, portalUrl };
  },
});

// ---------------------------------------------------------------------------
// submitFullForm — public mutation called by the client portal form.
//
// Re-verifies the token (we don't trust the client just because they reached
// the page — they could have tampered with the request), writes the captured
// fields to `event.bookingConfig`, appends any free-form notes to the event's
// `notes` field (preserving anything the admin already wrote), and advances
// `status` to `FormReturned` so the dashboard reflects what to do next.
//
// Notes are appended (not overwritten) and prefixed with a marker so the
// admin can tell them apart from internal notes.
// ---------------------------------------------------------------------------
export const submitFullForm = mutation({
  args: {
    token: v.string(),
    bandConfig: v.string(),
    djRequired: v.boolean(),
    equipmentSource: v.union(
      v.literal("LME"),
      v.literal("Venue"),
      v.literal("Mixed"),
    ),
    extras: v.array(v.string()),
    expectedGuests: v.optional(v.number()),
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

    // Append client-submitted notes to whatever the admin already had on the
    // event, prefixed so they're distinguishable in the admin UI. Empty
    // submissions don't clobber existing notes.
    const submitted = args.notes
      ? `[Client booking-form notes] ${args.notes}`
      : "";
    const newNotes = [event.notes ?? "", submitted]
      .filter((s) => s.length > 0)
      .join("\n\n");

    await ctx.db.patch(tokenRow.eventId, {
      status: "FormReturned",
      nextActionLabel: "Schedule discovery call",
      bookingConfig: {
        bandConfig: args.bandConfig,
        djRequired: args.djRequired,
        equipmentSource: args.equipmentSource,
        extras: args.extras,
        expectedGuests: args.expectedGuests,
      },
      notes: newNotes.length > 0 ? newNotes : undefined,
    });
    return null;
  },
});
