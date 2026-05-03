"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// bookingFormEmail — Node-runtime action that sends the "continue your
// booking" email containing the magic-link to the full booking form.
//
// Triggered by `bookingForm.sendFullForm` via `ctx.scheduler.runAfter(0,…)`.
// Lives in its own module so that `bookingForm.ts` can stay on the V8 runtime
// (mutations can't import from a "use node" file).
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

export const sendBookingFormEmail = internalAction({
  args: {
    to: v.string(),
    clientName: v.string(),
    portalUrl: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY missing — skipping booking form email");
      return null;
    }
    const resend = new Resend(apiKey);
    const firstName = escapeHtml(args.clientName.split(" ")[0] || "there");
    // The portal URL itself is server-generated and contains only [a-z0-9-/.:],
    // so it's safe to interpolate without escaping. Client name is escaped
    // because it ultimately came from a user-submitted field.
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Your LME booking — next step",
      html: `
        <p>Hi ${firstName},</p>
        <p>Thanks for your initial enquiry. We'd love to get a few more details so we can put a tailored proposal together for you.</p>
        <p><a href="${args.portalUrl}" style="display:inline-block;background:#14B8A6;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">Continue your booking</a></p>
        <p>The link is private — please keep it to yourself.</p>
        <p>— The LME team</p>
      `,
    });
    return null;
  },
});
