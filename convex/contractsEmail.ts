"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
      console.warn("RESEND_API_KEY missing — skipping contract email");
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
      subject: "Your LME contract is ready to sign",
      html: `
        <p>Hi ${firstName},</p>
        <p>Your performance contract is ready. Please review and sign it via the link below — it should take about a minute.</p>
        <p><a href="${args.portalUrl}" style="display:inline-block;background:#14B8A6;color:#000;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">Review &amp; sign</a></p>
        <p>Once signed, we'll send through the deposit invoice to lock in your date.</p>
        <p>— The LME team</p>
      `,
    });
    return null;
  },
});
