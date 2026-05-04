"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { PreEventSurveyInviteEmail } from "./emailTemplates/PreEventSurveyInvite";

// ---------------------------------------------------------------------------
// preEventSurveyEmail — Node-runtime action that sends the "last few details"
// email containing the magic-link to the pre-event survey.
//
// Triggered by `preEventSurvey.sendSurvey` via `ctx.scheduler.runAfter(0,…)`.
// Lives in its own module so that `preEventSurvey.ts` can stay on the V8
// runtime (mutations can't import from a "use node" file).
// ---------------------------------------------------------------------------

const FROM = process.env.BOOKINGS_FROM_ADDRESS ?? "enquiries@lmeband.com";

export const sendPreEventSurveyEmail = internalAction({
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
      throw new Error(
        "RESEND_API_KEY missing — pre-event survey email not sent",
      );
    }
    const resend = new Resend(apiKey);
    const firstName = args.clientName.split(" ")[0] || "there";
    // JSX auto-escapes firstName; portalUrl is server-generated and safe.
    const props = { firstName, portalUrl: args.portalUrl };
    const html = await render(PreEventSurveyInviteEmail(props));
    const text = await render(PreEventSurveyInviteEmail(props), {
      plainText: true,
    });
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Last few details for your LME booking",
      html,
      text,
    });
    return null;
  },
});
