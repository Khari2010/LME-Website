import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// xeroMutations — V8-runtime DB-write helpers for the Xero action layer.
//
// `convex/xero.ts` runs under `"use node"` (so it can use the Xero SDK / fetch
// with Node-only deps). Node-runtime files cannot expose `internalMutation`
// because mutations must be V8 deterministic. So when the Xero action wants
// to write back the resulting invoice ref, it schedules one of these mutations
// instead of patching the DB directly.
//
// Each handler patches `event.finance.xeroDepositInvoiceRef` (or `…Balance…`)
// while preserving all other finance fields. We treat `finance` as a
// `Record<string, unknown>` here because the schema accepts it as an open
// shape (`v.optional(v.object({...}))`) and we only want to add one key.
// ---------------------------------------------------------------------------

export const recordDepositInvoiceRef = internalMutation({
  args: { eventId: v.id("events"), invoiceNumber: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const f = (event.finance ?? {}) as Record<string, unknown>;
    await ctx.db.patch(args.eventId, {
      finance: { ...f, xeroDepositInvoiceRef: args.invoiceNumber },
    });
    return null;
  },
});

export const recordBalanceInvoiceRef = internalMutation({
  args: { eventId: v.id("events"), invoiceNumber: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const f = (event.finance ?? {}) as Record<string, unknown>;
    await ctx.db.patch(args.eventId, {
      finance: { ...f, xeroBalanceInvoiceRef: args.invoiceNumber },
    });
    return null;
  },
});
