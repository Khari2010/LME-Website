"use node";

/**
 * One-off backfill — read the latest event status for each message ID stored
 * on a campaign by querying Resend's API, and insert a `campaignEvents` row
 * for each. Used to populate metrics for sends that pre-date the webhook
 * being wired.
 *
 * Limitations: Resend's email-detail endpoint only exposes the *most recent*
 * event per message, so this captures terminal state (delivered, opened, or
 * clicked-most-recent). Real-time webhook ingestion captures every event.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type ResendEmail = {
  id: string;
  to: string[];
  last_event?:
    | "queued"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "bounced"
    | "complained"
    | "delivery_delayed";
  created_at?: string;
};

type EventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "delivery_delayed";

const VALID_EVENT_TYPES: ReadonlyArray<EventType> = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "delivery_delayed",
];

function normaliseLastEvent(value: string | undefined): EventType | null {
  if (!value) return null;
  return (VALID_EVENT_TYPES as ReadonlyArray<string>).includes(value)
    ? (value as EventType)
    : null;
}

export const run = internalAction({
  args: { campaignId: v.id("campaigns") },
  returns: v.object({
    fetched: v.number(),
    written: v.number(),
    skipped: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, { campaignId }) => {
    const apiKey = process.env.RESEND_BACKFILL_KEY ?? process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_BACKFILL_KEY (or RESEND_API_KEY) missing");

    const campaign = await ctx.runQuery(internal.campaigns.getCampaignInternal, {
      id: campaignId,
    });
    if (!campaign) throw new Error("campaign not found");

    const messageIds: string[] = campaign.resendBatchIds ?? [];
    console.log(
      `[backfill] campaign ${campaignId} has ${messageIds.length} message IDs`,
    );

    let fetched = 0;
    let written = 0;
    let skipped = 0;
    let errors = 0;

    for (const messageId of messageIds) {
      try {
        const res = await fetch(`https://api.resend.com/emails/${messageId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          console.warn(
            `[backfill] ${messageId} → HTTP ${res.status}`,
          );
          errors += 1;
          continue;
        }
        const email = (await res.json()) as ResendEmail;
        fetched += 1;

        const eventType = normaliseLastEvent(email.last_event);
        const recipient = email.to?.[0] ?? "";
        if (!eventType || !recipient) {
          skipped += 1;
          continue;
        }

        const occurredAt = email.created_at
          ? new Date(email.created_at).getTime()
          : Date.now();

        await ctx.runMutation(internal.campaigns.recordCampaignEventInternal, {
          campaignId,
          resendMessageId: messageId,
          recipientEmail: recipient,
          type: eventType,
          occurredAt,
        });
        written += 1;
      } catch (err) {
        console.error(`[backfill] ${messageId} threw`, err);
        errors += 1;
      }
    }

    console.log(
      `[backfill] done — fetched=${fetched} written=${written} skipped=${skipped} errors=${errors}`,
    );
    return { fetched, written, skipped, errors };
  },
});
