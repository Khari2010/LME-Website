"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Resend } from "resend";
import type { Id } from "./_generated/dataModel";

const FROM = process.env.ENHANCERS_FROM_ADDRESS ?? "enhancers@lmeband.com";
const SITE_URL = process.env.SITE_URL ?? "https://lmeband.com";

function injectUnsubscribe(html: string, token: string): string {
  const link = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
  const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #1f2937;font-size:11px;color:#6b7280;font-family:Helvetica,Arial,sans-serif;">You're receiving this because you signed up to LME's mailing list. <a href="${link}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>.</div>`;
  if (html.includes("/unsubscribe?token=")) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", footer + "</body>");
  }
  return html + footer;
}

function applyMergeTags(
  text: string,
  contact: { firstName?: string; name?: string; email?: string },
): string {
  return text
    .replace(/\{\{\s*firstName\s*\}\}/gi, contact.firstName?.trim() || "there")
    .replace(
      /\{\{\s*name\s*\}\}/gi,
      contact.name?.trim() || contact.firstName?.trim() || "there",
    )
    .replace(/\{\{\s*email\s*\}\}/gi, contact.email ?? "");
}

export const sendTest = action({
  args: {
    subject: v.string(),
    bodyHtml: v.string(),
    toEmail: v.string(),
  },
  handler: async (_ctx, { subject, bodyHtml, toEmail }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);
    const previewContact = { firstName: "Test", name: "Test", email: toEmail };
    const html = injectUnsubscribe(
      applyMergeTags(bodyHtml, previewContact),
      "test-preview",
    );
    const subjectWithMerges = applyMergeTags(subject, previewContact);
    const r = await resend.emails.send({
      from: `LME <${FROM}>`,
      to: [toEmail],
      subject: `[TEST] ${subjectWithMerges}`,
      html,
    });
    if (r.error) throw new Error(`Resend error: ${r.error.message}`);
    return { messageId: r.data?.id };
  },
});

export const sendCampaign = action({
  args: {
    subject: v.string(),
    preheader: v.optional(v.string()),
    bodyHtml: v.string(),
    sentBy: v.string(),
    draftId: v.optional(v.id("campaigns")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    {
      subject,
      preheader,
      bodyHtml,
      sentBy,
      draftId,
      tags,
    }: {
      subject: string;
      preheader?: string;
      bodyHtml: string;
      sentBy: string;
      draftId?: Id<"campaigns">;
      tags?: string[];
    },
  ) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);
    const recipients = await ctx.runQuery(
      api.contacts.getActiveContactsForSend,
      { tags },
    );
    if (recipients.length === 0) throw new Error("No active contacts");

    // Resend tag values must match [a-zA-Z0-9_-]; Convex Ids contain other
    // chars so sanitize to keep the API happy while still being filterable in
    // the Resend dashboard.
    const campaignTagValue = (draftId ?? "no-id").replace(/[^a-zA-Z0-9_-]/g, "_");

    let sent = 0;
    const allMessageIds: string[] = [];
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100);
      const emails = chunk.map((c) => ({
        from: `LME <${FROM}>`,
        to: [c.email],
        subject: applyMergeTags(subject, c),
        html: injectUnsubscribe(
          applyMergeTags(bodyHtml, c),
          c.unsubscribeToken ?? "missing",
        ),
        // Tag every email with the campaign id so we can filter in the Resend
        // dashboard. Open/click tracking itself is enabled at the domain level
        // in Resend account settings (no SDK flag at the time of writing).
        tags: [{ name: "campaign_id", value: campaignTagValue }],
      }));
      const r = await resend.batch.send(emails);
      if (r.error) throw new Error(`Resend batch error: ${r.error.message}`);
      sent += chunk.length;
      for (const item of r.data?.data ?? []) {
        if (item?.id) allMessageIds.push(item.id);
      }
    }

    const firstMessageId = allMessageIds[0];

    await ctx.runMutation(api.campaigns.recordSentCampaign, {
      draftId,
      subjectLine: subject,
      preheader,
      bodyHtml,
      sentBy,
      recipientCount: sent,
      recipientTags: tags ?? [],
      resendMessageId: firstMessageId,
      resendBatchIds: allMessageIds,
    });

    return { sent, firstMessageId, totalMessageIds: allMessageIds.length };
  },
});
