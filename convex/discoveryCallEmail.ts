"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { DiscoveryCallInviteEmail } from "./emailTemplates/DiscoveryCallInvite";

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
      // P7 bug-hunt fix: throw so missing-config surfaces in Convex logs
      // instead of silently dropping the email after the mutation has
      // already flipped state.
      throw new Error(
        "RESEND_API_KEY missing — discovery call email not sent",
      );
    }
    const resend = new Resend(apiKey);
    const firstName = args.clientName.split(" ")[0] || "there";
    // JSX auto-escapes firstName; portalUrl is server-generated and safe.
    const props = { firstName, portalUrl: args.portalUrl };
    const html = await render(DiscoveryCallInviteEmail(props));
    const text = await render(DiscoveryCallInviteEmail(props), {
      plainText: true,
    });
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Pick a time for our discovery call",
      html,
      text,
    });
    return null;
  },
});
