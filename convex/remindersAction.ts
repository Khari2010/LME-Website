"use node";

/**
 * Auto reminder cron — STUB
 *
 * Daily cron (registered in `convex/crons.ts`) that finds events with a
 * balance.dueDate 14, 7, or 1 days away (and not paid) and sends a reminder
 * email via Resend.
 *
 * Activation:
 *   - REMINDERS_ENABLED=true env var (default: false)
 *   - RESEND_API_KEY (already set for booking-flow emails)
 *   - BOOKINGS_FROM_ADDRESS (already set)
 *
 * Until enabled, the daily cron logs candidates without sending — useful for
 * verifying the query before going live.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

const FROM = process.env.BOOKINGS_FROM_ADDRESS ?? "enquiries@lmeband.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Candidate = {
  eventId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  daysUntilDue: number;
  dueDateMs: number;
};

/**
 * Fired daily by cron. Scans for candidates, logs them, sends emails when
 * REMINDERS_ENABLED is "true".
 */
export const dailyTick = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const enabled = process.env.REMINDERS_ENABLED === "true";

    const candidates = await ctx.runQuery(internal.reminders.findDueReminders, {});

    if (!candidates.length) {
      console.log("[reminders] no candidates today");
      return null;
    }

    console.log(`[reminders] ${candidates.length} candidate(s); enabled=${enabled}`);

    for (const c of candidates) {
      console.log(
        `[reminders] candidate: event=${c.eventId} client=${c.clientEmail} amount=£${c.amount} dueIn=${c.daysUntilDue}d`,
      );
      if (!enabled) continue;

      try {
        await sendReminderEmail(c);
      } catch (err) {
        console.error(`[reminders] failed for ${c.eventId}:`, err);
      }
    }

    return null;
  },
});

async function sendReminderEmail(c: Candidate): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[reminders] RESEND_API_KEY missing");
    return;
  }
  const resend = new Resend(apiKey);
  const firstName = escapeHtml(c.clientName.split(" ")[0] || "there");
  const dueStr = new Date(c.dueDateMs).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const urgency =
    c.daysUntilDue <= 1 ? "tomorrow" : c.daysUntilDue <= 7 ? "in a week" : "in two weeks";

  await resend.emails.send({
    from: `LME <${FROM}>`,
    to: c.clientEmail,
    subject: `Friendly reminder: balance due ${urgency}`,
    html: `
      <p>Hi ${firstName},</p>
      <p>Just a heads up — the remaining balance of <strong>£${c.amount.toFixed(2)}</strong> for your LME booking is due on <strong>${dueStr}</strong>.</p>
      <p>If you've already paid, ignore this message — payments can take a day or two to reflect.</p>
      <p>Any questions? Reply to this email.</p>
      <p>— The LME team</p>
    `,
  });
}
