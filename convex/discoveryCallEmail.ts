"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// discoveryCallEmail — Node-runtime action that sends the magic-link email
// inviting the client to pick one of the admin-proposed discovery call
// slots.
//
// Triggered by `discoveryCall.proposeSlots` via `ctx.scheduler.runAfter(0,…)`
// because Convex mutations can't directly call Node-runtime actions; the
// scheduled action runs in its own context with access to `process.env`.
// ---------------------------------------------------------------------------

const FROM = process.env.BOOKINGS_FROM_ADDRESS ?? "enquiries@lmeband.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const sendDiscoveryCallEmail = internalAction({
  args: {
    to: v.string(),
    clientName: v.string(),
    portalUrl: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "RESEND_API_KEY missing — skipping discovery call email",
      );
      return null;
    }
    const resend = new Resend(apiKey);
    const firstName = escapeHtml(args.clientName.split(" ")[0] || "there");
    // Portal URL is server-generated and contains only [a-z0-9-/.:], safe to
    // interpolate. Client name is escaped because it ultimately came from a
    // user-submitted field.
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Pick a time for our discovery call",
      html: `
        <p>Hi ${firstName},</p>
        <p>Thanks for sending through your booking details. The next step is a quick 15-minute call so we can confirm everything and put a tailored proposal together.</p>
        <p>Pick a time that works for you:</p>
        <p><a href="${args.portalUrl}" style="display:inline-block;background:#14B8A6;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">Choose a time</a></p>
        <p>Speak soon.</p>
        <p>— The LME team</p>
      `,
    });
    return null;
  },
});
