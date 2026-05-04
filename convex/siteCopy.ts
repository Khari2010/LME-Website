import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWrite } from "./auth";

// P6-T1: Public CMS for site copy.
//
// `getByKey` is read by public pages on the marketing site. When a key is
// missing it returns null, and the calling component falls back to hardcoded
// text — so a missing row never breaks the public site.
//
// `list` powers the admin editor; `setByKey` upserts a key (gated by
// requireWrite "settings" so only directors/owners can edit), `remove`
// deletes a key (causing public pages to fall back to their hardcoded copy).

export const getByKey = query({
  args: { key: v.string() },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("siteCopy")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? null;
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("siteCopy"),
      key: v.string(),
      value: v.string(),
      updatedAt: v.number(),
      updatedBy: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("siteCopy").collect();
    return rows
      .map((r) => ({
        _id: r._id,
        key: r.key,
        value: r.value,
        updatedAt: r.updatedAt,
        updatedBy: r.updatedBy,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  },
});

export const setByKey = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    updatedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "settings");
    if (!args.key.trim()) throw new Error("key required");
    const existing = await ctx.db
      .query("siteCopy")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
    } else {
      await ctx.db.insert("siteCopy", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
    }
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("siteCopy") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "settings");
    await ctx.db.delete(args.id);
    return null;
  },
});
