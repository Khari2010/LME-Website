"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// ---------------------------------------------------------------------------
// preEventSurveyEmail — Node-runtime action that sends the "last few details"
// email containing the magic-link to the pre-event survey.
//
// Triggered by `preEventSurvey.sendSurvey` via `ctx.scheduler.runAfter(0,…)`.
// Lives in its own module so that `preEventSurvey.ts` can stay on the V8
// runtime (mutations can't import from a "use node" file).
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
    const firstName = escapeHtml(args.clientName.split(" ")[0] || "there");
    // Portal URL is server-generated and contains only [a-z0-9-/.:], safe to
    // interpolate. Client name is escaped because it ultimately came from a
    // user-submitted field.
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Last few details for your LME booking",
      html: `
        <p>Hi ${firstName},</p>
        <p>Your event is coming up soon — we want to make sure it goes exactly how you want it.</p>
        <p>Could you take a couple of minutes to fill in the final details (genres you love, must-play tracks, do-not-plays, day-of contact)?</p>
        <p><a href="${args.portalUrl}" style="display:inline-block;background:#14B8A6;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">Complete pre-event details</a></p>
        <p>Looking forward to it.</p>
        <p>— The LME team</p>
      `,
    });
    return null;
  },
});
