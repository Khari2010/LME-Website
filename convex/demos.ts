import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWrite } from "./auth";

// P4-T5: Demos library. Standalone audio/video demos (SoundCloud / YouTube /
// Dropbox links). Mirrors the songs CRUD pattern — soft-delete via `archived`
// instead of hard delete so a demo can be restored without losing history.

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const all = await ctx.db.query("demos").collect();
    return args.includeArchived ? all : all.filter((d) => !d.archived);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    url: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    linkedSongId: v.optional(v.id("songs")),
  },
  returns: v.id("demos"),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    if (!args.title.trim()) throw new Error("title required");
    if (!args.url.trim()) throw new Error("url required");
    return await ctx.db.insert("demos", { ...args, archived: false });
  },
});

export const update = mutation({
  args: {
    id: v.id("demos"),
    patch: v.object({
      title: v.optional(v.string()),
      url: v.optional(v.string()),
      description: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      linkedSongId: v.optional(v.id("songs")),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    await ctx.db.patch(args.id, args.patch);
    return null;
  },
});

export const setArchived = mutation({
  args: { id: v.id("demos"), archived: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    await ctx.db.patch(args.id, { archived: args.archived });
    return null;
  },
});
