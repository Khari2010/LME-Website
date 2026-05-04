"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { ContractReadyEmail } from "./emailTemplates/ContractReady";

// ---------------------------------------------------------------------------
// contractsEmail — Node-runtime action that sends the "your contract is
// ready to sign" email containing the magic-link to the client portal's
// contract page.
//
// Triggered by `contracts.sendContract` via `ctx.scheduler.runAfter(0,…)`.
// Lives in its own module so that `contracts.ts` can stay on the V8 runtime
// (mutations can't import from a "use node" file).
// ---------------------------------------------------------------------------

const FROM = process.env.BOOKINGS_FROM_ADDRESS ?? "enquiries@lmeband.com";

export const sendContractEmail = internalAction({
  args: {
    to: v.string(),
    clientName: v.string(),
    portalUrl: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // P7 bug-hunt fix: throw instead of silently no-op'ing. The triggering
      // mutation has already flipped `event.contract.sentAt` so admin sees
      // "sent" — silently skipping the email gives the client nothing. By
      // throwing, Convex logs the failure (and retries with backoff for
      // scheduled actions), surfacing the missing-config bug.
      throw new Error("RESEND_API_KEY missing — contract email not sent");
    }
    const resend = new Resend(apiKey);
    const firstName = args.clientName.split(" ")[0] || "there";
    // JSX auto-escapes firstName interpolation; portalUrl is server-generated
    // and safe to interpolate.
    const props = { firstName, portalUrl: args.portalUrl };
    const html = await render(ContractReadyEmail(props));
    const text = await render(ContractReadyEmail(props), { plainText: true });
    await resend.emails.send({
      from: `LME <${FROM}>`,
      to: args.to,
      subject: "Your LME contract is ready to sign",
      html,
      text,
    });
    return null;
  },
});
