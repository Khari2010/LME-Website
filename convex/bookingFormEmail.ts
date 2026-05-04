"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { BookingFormInviteEmail } from "./emailTemplates/BookingFormInvite";

// ---------------------------------------------------------------------------
// bookingFormEmail — Node-runtime action that sends the "continue your
// booking" email containing the magic-link to the full booking form.
//
// Triggered by `bookingForm.sendFullForm` via `ctx.scheduler.runAfter(0,…)`.
// Lives in its own module so that `bookingForm.ts` can stay on the V8 runtime
// (mutations can't import from a "use node" file).
// ---------------------------------------------------------------------------

const FROM = process.env.BOOKINGS_FROM_ADDRESS ?? "enquiries@lmeband.com";

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
      // P7 bug-hunt fix: throw so missing-config surfaces in Convex logs
      // instead of silently dropping the email after the mutation has
      // already flipped state.
      throw new Error("RESEND_API_KEY missing — booking form email not sent");
    }
    const resend = new Resend(apiKey);
    const firstName = args.clientName.split(" ")[0] || "there";
    // JSX auto-escapes the firstName interpolation in the template; the
    // portalUrl is server-generated and contains only [a-z0-9-/.:] so it's
    // also safe.
    const props = { firstName, portalUrl: args.portalUrl };
    const html = await render(BookingFormInviteEmail(props));
    const text = await render(BookingFormInviteEmail(props), {
      plainText: true,
    });
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Your LME booking — next step",
      html,
      text,
    });
    return null;
  },
});
