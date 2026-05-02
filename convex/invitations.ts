import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STATUS = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
  v.literal("expired"),
);

export const listPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("invitations", {
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      clerkInvitationId: args.clerkInvitationId,
      status: "pending",
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
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

export const getInvitationByClerkId = query({
  args: { clerkInvitationId: v.string() },
  handler: async (ctx, { clerkInvitationId }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkInvitationId", clerkInvitationId),
      )
      .first();
  },
});
