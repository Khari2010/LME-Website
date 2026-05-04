"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { InquiryConfirmationEmail } from "./emailTemplates/InquiryConfirmation";

const FROM = process.env.BOOKINGS_FROM_ADDRESS ?? "enquiries@lmeband.com";

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
    const firstName = args.clientName.split(" ")[0] || "there";
    // JSX in the template auto-escapes the firstName interpolation, so no
    // manual escapeHtml is needed here.
    const html = await render(InquiryConfirmationEmail({ firstName }));
    const text = await render(InquiryConfirmationEmail({ firstName }), {
      plainText: true,
    });
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.clientEmail,
      subject: "Thanks for your enquiry — LME",
      html,
      text,
    });
    return null;
  },
});
