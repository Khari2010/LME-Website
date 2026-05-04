import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./auth";

const STATUS = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
  v.literal("expired"),
);

export const listPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows.sort((a, b) => b.invitedAt - a.invitedAt);
  },
});

export const insertInvitation = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    clerkInvitationId: v.string(),
    invitedBy: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("invitations", {
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      clerkInvitationId: args.clerkInvitationId,
      status: "pending",
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      role: args.role,
    });
  },
});

export const setInvitationStatus = mutation({
  args: {
    clerkInvitationId: v.string(),
    status: STATUS,
  },
  handler: async (ctx, { clerkInvitationId, status }) => {
    const row = await ctx.db
      .query("invitations")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkInvitationId", clerkInvitationId),
      )
      .first();
    if (row) await ctx.db.patch(row._id, { status });
  },
});

export const markAcceptedByEmail = mutation({
  args: { email: v.string(), at: v.number() },
  handler: async (ctx, { email, at }) => {
    const lower = email.toLowerCase();
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", lower))
      .collect();
    const pending = rows.find((r) => r.status === "pending");
    if (pending) {
      await ctx.db.patch(pending._id, { status: "accepted", acceptedAt: at });
    }
  },
});

/**
 * Look up the role assigned in a pending invitation for an email — used by
 * the Clerk webhook on user.created so the new user gets the correct role
 * rather than defaulting to "admin".
 *
 * PUBLIC by design — the Clerk webhook handler signature-verifies each
 * request via `verifyWebhook` before calling this query. We only return the
 * role string (e.g. "admin" / "marketing") which is non-sensitive and gated
 * to invitations the caller could already discover by attempting to join.
 */
export const getPendingRoleForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const lower = email.toLowerCase();
    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", lower))
      .collect();
    const pending = rows.find((r) => r.status === "pending");
    return pending?.role ?? null;
  },
});

export const getInvitationByClerkId = query({
  args: { clerkInvitationId: v.string() },
  handler: async (ctx, { clerkInvitationId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("invitations")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkInvitationId", clerkInvitationId),
      )
      .first();
  },
});
