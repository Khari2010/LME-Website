"use node";
import { internalAction } from "./_generated/server";
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

export const sendConfirmationEmail = internalAction({
  args: {
    eventId: v.id("events"),
    clientEmail: v.string(),
    clientName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // P7 bug-hunt fix: throw so missing-config surfaces in Convex logs
      // instead of silently dropping the public-inquiry confirmation email.
      throw new Error(
        "RESEND_API_KEY missing — public inquiry confirmation email not sent",
      );
    }
    const resend = new Resend(apiKey);
    const firstName = escapeHtml(args.clientName.split(" ")[0]);
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.clientEmail,
      subject: "Thanks for your enquiry — LME",
      html: `<p>Hi ${firstName},</p><p>Thanks for reaching out about a booking. We'll be in touch within 48 hours to discuss the details.</p><p>— The LME team</p>`,
    });
    return null;
  },
});
