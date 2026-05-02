import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const ROLE = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("drafter"),
);

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    return rows.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

export const upsertUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(ROLE),
    joinedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        // role only updated if explicitly provided; otherwise keep existing
        ...(args.role ? { role: args.role } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      role: args.role ?? "admin",
      joinedAt: args.joinedAt,
    });
  },
});

export const deleteUserByClerkId = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const row = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

export const patchLastSignIn = mutation({
  args: { clerkUserId: v.string(), at: v.number() },
  handler: async (ctx, { clerkUserId, at }) => {
    const row = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
    if (row) await ctx.db.patch(row._id, { lastSignInAt: at });
  },
});
