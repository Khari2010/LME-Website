import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWrite } from "./auth";

// Shape used by `create` — every field except `archived` (which the mutation
// sets server-side). Reused so the page form can stay aligned with the
// validator without duplicating shape definitions.
const songValidator = v.object({
  title: v.string(),
  artist: v.optional(v.string()),
  songKey: v.optional(v.string()),
  bpm: v.optional(v.number()),
  lead: v.optional(v.string()),
  genres: v.array(v.string()),
  demoLinks: v.array(v.string()),
  notes: v.optional(v.string()),
});

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const all = await ctx.db.query("songs").order("asc").collect();
    if (args.includeArchived) return all;
    return all.filter((s) => !s.archived);
  },
});

export const getById = query({
  args: { id: v.id("songs") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: songValidator,
  returns: v.id("songs"),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    if (!args.title.trim()) throw new Error("title required");
    return await ctx.db.insert("songs", { ...args, archived: false });
  },
});

export const update = mutation({
  args: {
    id: v.id("songs"),
    patch: v.object({
      title: v.optional(v.string()),
      artist: v.optional(v.string()),
      songKey: v.optional(v.string()),
      bpm: v.optional(v.number()),
      lead: v.optional(v.string()),
      genres: v.optional(v.array(v.string())),
      demoLinks: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
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
  args: { id: v.id("songs"), archived: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    await ctx.db.patch(args.id, { archived: args.archived });
    return null;
  },
});
