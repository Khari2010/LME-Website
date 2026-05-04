import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// bookingTokens — magic-link tokens for the client booking portal (Phase 1b).
//
// We mint one (or more) opaque tokens per `events` row when an admin sends a
// client-facing email (e.g. "send full booking form"). The token is embedded
// in the URL the client clicks; the portal Server Component verifies it via
// `verifyToken`. Tokens live in Convex (not as signed cookies) so we can
// revoke them, track expiry, and audit access without any HMAC secret.
//
// Mirror of the `/enhancers` magic-link pattern in `src/lib/enhancers/`,
// adapted: tokens here are scoped to a specific event (not a contact) and
// have a 6-month default TTL (booking lifecycles are long).
// ---------------------------------------------------------------------------

// Default TTL for a fresh booking token: 6 months. Booking lifecycles span
// from initial inquiry through to post-event survey, so this needs to be
// generous. Admins can revoke earlier via `revokeForEvent` if needed.
const DEFAULT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// Generate a 32-char URL-safe opaque token. Two stripped UUIDs are
// concatenated to give 64 hex chars (well over the 32-char minimum) and the
// resulting string only contains [0-9a-f], so it's URL-safe without any
// encoding. Consumers don't need to parse this — it's just a lookup key.
function generateToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

// ===== Mutations =====

export const mintForEvent = internalMutation({
  args: {
    eventId: v.id("events"),
    // Override the default TTL (e.g. tests pass a negative value to mint an
    // already-expired token). Defaults to 6 months.
    expiresInMs: v.optional(v.number()),
  },
  returns: v.object({
    token: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const ttl = args.expiresInMs ?? DEFAULT_TTL_MS;
    const token = generateToken();
    const expiresAt = now + ttl;

    await ctx.db.insert("bookingTokens", {
      eventId: args.eventId,
      token,
      mintedAt: now,
      expiresAt,
    });

    return { token, expiresAt };
  },
});

// Public mutation: admin can call directly from the event detail UI to
// revoke all portal tokens for a booking (e.g. when a client's link has
// been forwarded). Auth is enforced at the proxy/Clerk layer — same
// pattern as other Phase 1a admin mutations.
export const revokeForEvent = mutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const tokens = await ctx.db
      .query("bookingTokens")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const t of tokens) {
      // Don't overwrite an existing revocation timestamp — preserves the
      // original revocation time for audit purposes.
      if (t.revokedAt === undefined) {
        await ctx.db.patch(t._id, { revokedAt: now });
      }
    }
    return null;
  },
});

// ===== Queries =====

// Reasons returned by `verifyToken` when `valid: false`. Kept narrow on
// purpose — these are user-facing categories, not internal error strings.
const verifyReasonValidator = v.union(
  v.literal("not_found"),
  v.literal("revoked"),
  v.literal("expired"),
);

export const verifyToken = query({
  args: { token: v.string() },
  returns: v.object({
    valid: v.boolean(),
    eventId: v.optional(v.id("events")),
    reason: v.optional(verifyReasonValidator),
  }),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (row === null) {
      return { valid: false, reason: "not_found" as const };
    }
    if (row.revokedAt !== undefined) {
      return { valid: false, reason: "revoked" as const };
    }
    if (row.expiresAt <= Date.now()) {
      return { valid: false, reason: "expired" as const };
    }
    return { valid: true, eventId: row.eventId };
  },
});
