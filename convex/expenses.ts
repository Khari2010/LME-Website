import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireWrite } from "./auth";

/**
 * List expenses, optionally filtered to a date window.
 *
 * `fromMs` is inclusive, `toMs` is exclusive — same convention used by the
 * quarterly aggregation in `finance.getCashflowSummary` so the two stay
 * aligned. Results are ordered newest-first.
 */
export const list = query({
  args: { fromMs: v.optional(v.number()), toMs: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("expenses")
      .withIndex("by_date")
      .order("desc")
      .collect();
    return all.filter((e) => {
      if (args.fromMs !== undefined && e.date < args.fromMs) return false;
      if (args.toMs !== undefined && e.date >= args.toMs) return false;
      return true;
    });
  },
});

export const create = mutation({
  args: {
    date: v.number(),
    amount: v.number(),
    category: v.string(),
    description: v.string(),
    receiptUrl: v.optional(v.string()),
    linkedEventId: v.optional(v.id("events")),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "finance");
    if (args.amount <= 0) throw new Error("amount must be positive");
    if (!args.description.trim()) throw new Error("description required");
    return await ctx.db.insert("expenses", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("expenses"),
    patch: v.object({
      date: v.optional(v.number()),
      amount: v.optional(v.number()),
      category: v.optional(v.string()),
      description: v.optional(v.string()),
      receiptUrl: v.optional(v.string()),
      linkedEventId: v.optional(v.id("events")),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "finance");
    await ctx.db.patch(args.id, args.patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("expenses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWrite(ctx, "finance");
    await ctx.db.delete(args.id);
    return null;
  },
});
