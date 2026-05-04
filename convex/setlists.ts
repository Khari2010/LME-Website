import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWrite } from "./auth";

// Each setlist item references a song plus optional inline notes. `order` is
// the canonical sort key — `setItems` sorts by it before persisting and
// renumbers 0..n-1 to keep things tidy regardless of what the client passes.
const itemValidator = v.object({
  order: v.number(),
  songId: v.id("songs"),
  notes: v.optional(v.string()),
});

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("setlists").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("setlists") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const create = mutation({
  args: { name: v.string(), purpose: v.optional(v.string()) },
  returns: v.id("setlists"),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    if (!args.name.trim()) throw new Error("name required");
    return await ctx.db.insert("setlists", {
      name: args.name,
      purpose: args.purpose,
      items: [],
    });
  },
});

export const updateMeta = mutation({
  args: {
    id: v.id("setlists"),
    name: v.string(),
    purpose: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    if (!args.name.trim()) throw new Error("name required");
    await ctx.db.patch(args.id, {
      name: args.name,
      purpose: args.purpose,
    });
    return null;
  },
});

export const setItems = mutation({
  args: { id: v.id("setlists"), items: v.array(itemValidator) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    // Sort by order to enforce contract; renumber 0..n-1 to keep clean.
    const sorted = [...args.items]
      .sort((a, b) => a.order - b.order)
      .map((it, i) => ({
        order: i,
        songId: it.songId,
        notes: it.notes,
      }));
    await ctx.db.patch(args.id, { items: sorted });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("setlists") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "music");
    await ctx.db.delete(args.id);
    return null;
  },
});
