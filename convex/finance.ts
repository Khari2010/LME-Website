import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./auth";

/**
 * Quarterly cashflow rollup. Revenue is recognised when a deposit / balance
 * is marked `paid` AND its `paidAt` falls inside the quarter. Expenses are
 * summed by `expenses.date`. Default window: last 4 quarters (current + 3
 * prior), oldest-first in the response array.
 */
export const getCashflowSummary = query({
  args: { quarters: v.optional(v.number()) },
  returns: v.object({
    totalRevenue: v.number(),
    totalExpenses: v.number(),
    net: v.number(),
    quarters: v.array(
      v.object({
        label: v.string(),
        startMs: v.number(),
        endMs: v.number(),
        revenue: v.number(),
        expenses: v.number(),
        net: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const quarterCount = args.quarters ?? 4;
    const now = new Date();
    const quarters: Array<{ label: string; startMs: number; endMs: number }> = [];
    const currentQ = Math.floor(now.getMonth() / 3);
    let year = now.getFullYear();
    let q = currentQ;
    for (let i = 0; i < quarterCount; i++) {
      const startMonth = q * 3;
      const start = new Date(year, startMonth, 1);
      const end = new Date(year, startMonth + 3, 1);
      quarters.unshift({
        label: `Q${q + 1} ${year}`,
        startMs: start.getTime(),
        endMs: end.getTime(),
      });
      q -= 1;
      if (q < 0) {
        q = 3;
        year -= 1;
      }
    }

    const events = await ctx.db.query("events").collect();
    const expenses = await ctx.db.query("expenses").collect();

    const result = quarters.map((qr) => {
      let revenue = 0;
      for (const e of events) {
        const f = e.finance;
        if (!f) continue;
        if (
          f.deposit?.paid &&
          f.deposit.paidAt !== undefined &&
          f.deposit.paidAt >= qr.startMs &&
          f.deposit.paidAt < qr.endMs
        ) {
          revenue += f.deposit.amount;
        }
        if (
          f.balance?.paid &&
          f.balance.paidAt !== undefined &&
          f.balance.paidAt >= qr.startMs &&
          f.balance.paidAt < qr.endMs
        ) {
          revenue += f.balance.amount;
        }
      }
      let exp = 0;
      for (const ex of expenses) {
        if (ex.date >= qr.startMs && ex.date < qr.endMs) exp += ex.amount;
      }
      return { ...qr, revenue, expenses: exp, net: revenue - exp };
    });

    const totalRevenue = result.reduce((sum, qr) => sum + qr.revenue, 0);
    const totalExpenses = result.reduce((sum, qr) => sum + qr.expenses, 0);

    return {
      totalRevenue,
      totalExpenses,
      net: totalRevenue - totalExpenses,
      quarters: result,
    };
  },
});

/**
 * Flatten every event's `finance` block into a single invoice-style table.
 * Excludes events with no finance set. `overdue` is true when (a) the
 * balance is unpaid past its due date, OR (b) the event has already
 * happened and a non-zero deposit is still unpaid.
 */
export const getInvoicesView = query({
  args: {},
  returns: v.array(
    v.object({
      eventId: v.id("events"),
      eventName: v.string(),
      eventDate: v.number(),
      type: v.string(),
      clientName: v.optional(v.string()),
      fee: v.optional(v.number()),
      depositAmount: v.optional(v.number()),
      depositPaid: v.boolean(),
      balanceAmount: v.optional(v.number()),
      balancePaid: v.boolean(),
      balanceDueDate: v.optional(v.number()),
      xeroDepositRef: v.optional(v.string()),
      xeroBalanceRef: v.optional(v.string()),
      overdue: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    await requireAuth(ctx);
    const events = await ctx.db.query("events").collect();
    const out: Array<{
      eventId: Id<"events">;
      eventName: string;
      eventDate: number;
      type: string;
      clientName?: string;
      fee?: number;
      depositAmount?: number;
      depositPaid: boolean;
      balanceAmount?: number;
      balancePaid: boolean;
      balanceDueDate?: number;
      xeroDepositRef?: string;
      xeroBalanceRef?: string;
      overdue: boolean;
    }> = [];
    const now = Date.now();
    for (const e of events) {
      if (!e.finance) continue;
      const f = e.finance;
      if (f.fee == null && f.deposit == null && f.balance == null) continue;
      const overdue = Boolean(
        (f.balance && !f.balance.paid && f.balance.dueDate < now) ||
          (f.deposit &&
            !f.deposit.paid &&
            f.deposit.amount > 0 &&
            e.startDate < now),
      );
      out.push({
        eventId: e._id,
        eventName: e.name,
        eventDate: e.startDate,
        type: e.type,
        clientName: e.client?.name,
        fee: f.fee,
        depositAmount: f.deposit?.amount,
        depositPaid: f.deposit?.paid ?? false,
        balanceAmount: f.balance?.amount,
        balancePaid: f.balance?.paid ?? false,
        balanceDueDate: f.balance?.dueDate,
        xeroDepositRef: f.xeroDepositInvoiceRef,
        xeroBalanceRef: f.xeroBalanceInvoiceRef,
        overdue,
      });
    }
    return out.sort((a, b) => a.eventDate - b.eventDate);
  },
});

/**
 * List every event that has had a contract sent (sentAt set), regardless of
 * signing status. Newest-sent first.
 */
export const getContractsView = query({
  args: {},
  returns: v.array(
    v.object({
      eventId: v.id("events"),
      eventName: v.string(),
      eventDate: v.number(),
      type: v.string(),
      clientName: v.optional(v.string()),
      sentAt: v.optional(v.number()),
      signedAt: v.optional(v.number()),
      signedByName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await requireAuth(ctx);
    const events = await ctx.db.query("events").collect();
    const out: Array<{
      eventId: Id<"events">;
      eventName: string;
      eventDate: number;
      type: string;
      clientName?: string;
      sentAt?: number;
      signedAt?: number;
      signedByName?: string;
    }> = [];
    for (const e of events) {
      if (!e.contract?.sentAt) continue;
      out.push({
        eventId: e._id,
        eventName: e.name,
        eventDate: e.startDate,
        type: e.type,
        clientName: e.client?.name,
        sentAt: e.contract.sentAt,
        signedAt: e.contract.signedAt,
        signedByName: e.contract.signedByName,
      });
    }
    return out.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
  },
});
