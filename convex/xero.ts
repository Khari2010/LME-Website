"use node";

/**
 * Xero integration — STUB
 *
 * Phase 1b ships the *shape* of Xero integration so contract / invoice / payment
 * flows work end-to-end inside the platform without live Xero calls.
 *
 * Activation requires:
 *   1. Xero developer account + new app at https://developer.xero.com
 *   2. OAuth 2.0 flow (authorization_code) — Khari completes once, refresh
 *      token stored in Convex env vars
 *   3. Env vars set in Convex prod:
 *        XERO_CLIENT_ID
 *        XERO_CLIENT_SECRET
 *        XERO_TENANT_ID
 *        XERO_REFRESH_TOKEN  (rotates; needs background refresh — see step 4)
 *   4. A `convex/cron.ts` cron that runs every 25 minutes to refresh the
 *      access token before it expires (Xero access tokens last 30 min)
 *
 * Until those are set, every action below short-circuits with a console.warn
 * and returns a stubbed result so the rest of the lifecycle still flows.
 *
 * Replace the body of each handler when the OAuth flow is set up.
 *
 * @see docs/superpowers/plans/deploy-notes-phase-1b.md for full Xero setup
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function xeroConfigured(): boolean {
  return Boolean(
    process.env.XERO_CLIENT_ID &&
      process.env.XERO_CLIENT_SECRET &&
      process.env.XERO_TENANT_ID &&
      process.env.XERO_REFRESH_TOKEN,
  );
}

/**
 * Push an invoice to Xero. Returns the Xero invoice number (e.g. "INV-0042")
 * or a stub reference like "STUB-INV-1715000000" when Xero isn't configured.
 *
 * TODO(phase-1b): Replace with real Xero API call:
 *   POST https://api.xero.com/api.xro/2.0/Invoices
 *   { Type: "ACCREC", Contact: { Name }, Date, DueDate, LineItems, Status: "AUTHORISED" }
 */
export const pushInvoice = internalAction({
  args: {
    eventId: v.id("events"),
    kind: v.union(v.literal("deposit"), v.literal("balance")),
    contactName: v.string(),
    contactEmail: v.string(),
    amount: v.number(),
    dueDateMs: v.number(),
    reference: v.optional(v.string()),
  },
  returns: v.object({
    invoiceNumber: v.string(),
    invoiceUrl: v.optional(v.string()),
    stubbed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (!xeroConfigured()) {
      console.warn(
        `[xero stub] Would push ${args.kind} invoice for £${args.amount} to ${args.contactEmail} (event ${args.eventId})`,
      );
      const invoiceNumber = `STUB-INV-${Date.now()}`;
      // Even when stubbed, write the ref back to the event so the UI can show
      // "Xero refs:" — and the same code path is exercised once OAuth lands.
      await ctx.scheduler.runAfter(
        0,
        args.kind === "deposit"
          ? internal.xeroMutations.recordDepositInvoiceRef
          : internal.xeroMutations.recordBalanceInvoiceRef,
        { eventId: args.eventId, invoiceNumber },
      );
      return {
        invoiceNumber,
        invoiceUrl: undefined,
        stubbed: true,
      };
    }

    // TODO: real Xero API call
    // const accessToken = await getAccessToken();
    // const response = await fetch("https://api.xero.com/api.xro/2.0/Invoices", { ... });
    // const xeroInvoice = await response.json();
    // const invoiceNumber = xeroInvoice.Invoices[0].InvoiceNumber;
    // await ctx.scheduler.runAfter(0,
    //   args.kind === "deposit"
    //     ? internal.xeroMutations.recordDepositInvoiceRef
    //     : internal.xeroMutations.recordBalanceInvoiceRef,
    //   { eventId: args.eventId, invoiceNumber });
    // return { invoiceNumber, invoiceUrl: ..., stubbed: false };

    throw new Error("Xero is configured but the real call is not yet implemented");
  },
});

/**
 * Webhook handler — Xero pings this when an invoice is paid (or status changes).
 * Mounted at `/api/xero/webhook` (route handler — to be added in Phase 1b later).
 *
 * For now: accept the payload, log it, return success. Real implementation
 * needs Xero webhook signature verification and event-store dedupe.
 */
export const handleWebhook = internalAction({
  args: {
    payload: v.any(),
    signature: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    if (!xeroConfigured()) {
      console.warn("[xero stub] Webhook received but Xero not configured", args.payload);
      return null;
    }

    // TODO: verify signature, parse events, find matching engagement by xeroDepositInvoiceRef / xeroBalanceInvoiceRef, patch event finance.deposit.paid / finance.balance.paid

    return null;
  },
});

/**
 * Refresh the OAuth access token. Runs every 25 minutes via cron when Xero is
 * configured. Stores the new refresh token (Xero rotates them) in Convex env.
 *
 * TODO: actual refresh requires storing the new refresh_token securely
 * (Convex doesn't allow setting env vars from inside a function — would need
 * a separate "secrets" table or external secret store).
 */
export const refreshAccessToken = internalAction({
  args: {},
  returns: v.null(),
  handler: async () => {
    if (!xeroConfigured()) return null;
    // TODO: implement when OAuth is set up
    return null;
  },
});
