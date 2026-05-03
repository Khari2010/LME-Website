/**
 * Reminder candidate scan. V8 runtime — no Node-only deps.
 *
 * The cron-fired action lives in convex/remindersAction.ts (Node runtime).
 */

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

const REMINDER_OFFSETS_DAYS = [14, 7, 1];

/**
 * Scans events for reminder candidates. Pure read-only.
 *
 * Note: this query is intentionally small-scale. At >1000 active bookings,
 * add a date-indexed lookup instead of full scan.
 */
export const findDueReminders = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      eventId: v.id("events"),
      clientName: v.string(),
      clientEmail: v.string(),
      amount: v.number(),
      daysUntilDue: v.number(),
      dueDateMs: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_family_and_date", (q) => q.eq("family", "ExternalBooking"))
      .collect();

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    const out: Array<{
      eventId: typeof events[number]["_id"];
      clientName: string;
      clientEmail: string;
      amount: number;
      daysUntilDue: number;
      dueDateMs: number;
    }> = [];

    for (const e of events) {
      if (!e.finance?.balance) continue;
      if (e.finance.balance.paid) continue;
      if (!e.client?.email) continue;

      const daysUntilDue = Math.round((e.finance.balance.dueDate - now) / msPerDay);
      if (!REMINDER_OFFSETS_DAYS.includes(daysUntilDue)) continue;

      out.push({
        eventId: e._id,
        clientName: e.client.name || "",
        clientEmail: e.client.email,
        amount: e.finance.balance.amount,
        daysUntilDue,
        dueDateMs: e.finance.balance.dueDate,
      });
    }

    return out;
  },
});
