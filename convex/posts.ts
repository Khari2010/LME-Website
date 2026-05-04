import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// `getPublishedPosts` and `getPostBySlug` are intentionally PUBLIC — they
// power the unauthenticated /enhancers blog feed on lmeband.com. Both queries
// filter to `status === "published"` so draft posts are never exposed.

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
    const row = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    // Defence in depth: never return a non-published post to the public feed
    // (the page filter does this too, but enforcing it at the query layer is
    // safer against accidental misuse).
    if (!row || row.status !== "published") return null;
    return row;
  },
});

// One-off seed mutation. Used by scripts/seed-enhancer-posts.ts in #1a.
// Safe to call from a script; no auth check by design — expected to be invoked
// once at deploy time from a trusted environment.
export const seedPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    bodyHtml: v.string(),
    heroImageUrl: v.optional(v.string()),
    featured: v.boolean(),
    type: v.union(
      v.literal("post"),
      v.literal("mix"),
      v.literal("listen-link"),
      v.literal("feedback-request"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    publishedDate: v.optional(v.number()),
    embedUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("posts", args);
  },
});

// Set hero image on an existing post by slug. Admin tooling will replace this.
export const setHeroImageBySlug = mutation({
  args: { slug: v.string(), heroImageUrl: v.string() },
  handler: async (ctx, { slug, heroImageUrl }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!post) throw new Error(`No post with slug "${slug}"`);
    await ctx.db.patch(post._id, { heroImageUrl });
    return { ok: true };
  },
});
