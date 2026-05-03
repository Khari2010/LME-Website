"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

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
      console.warn("RESEND_API_KEY missing — skipping confirmation email");
      return null;
    }
    const resend = new Resend(apiKey);
    const firstName = args.clientName.split(" ")[0];
    await resend.emails.send({
      from: "LME <enquiries@lmeband.com>",
      to: args.clientEmail,
      subject: "Thanks for your enquiry — LME",
      html: `<p>Hi ${firstName},</p><p>Thanks for reaching out about a booking. We'll be in touch within 48 hours to discuss the details.</p><p>— The LME team</p>`,
    });
    return null;
  },
});
