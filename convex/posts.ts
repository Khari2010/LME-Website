import { v } from "convex/values";
import { query } from "./_generated/server";

export const getPublishedPosts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db
      .query("posts")
      .withIndex("by_status_and_date", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit ?? 12);
    return all;
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});
