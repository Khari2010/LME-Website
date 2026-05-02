"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Resend } from "resend";

const CLERK_API = "https://api.clerk.com/v1";
const SITE_URL = process.env.SITE_URL ?? "https://www.lmeband.com";
const FROM = process.env.ENHANCERS_FROM_ADDRESS ?? "enhancers@lmeband.com";

function clerkHeaders() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set in Convex env");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function inviteEmailHtml(inviterName: string, firstName: string | undefined, ticketUrl: string, recipientEmail: string) {
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#080808;font-family:Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080808"><tr><td align="center" style="padding:40px 24px;"><table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td><p style="color:#14B8A6;font-size:14px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 16px;">LME · Admin</p><h1 style="color:#ffffff;font-size:36px;font-weight:700;margin:0 0 16px;line-height:1.1;">You're in.</h1><p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 16px;">${greeting} ${inviterName} just added you to the LME admin platform — replacing MailChimp + giving the band a proper home for campaigns, contacts, bookings, and more.</p><p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 32px;">Click below to set up your password and get in.</p><table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="background-color:#14B8A6;border-radius:6px;"><a href="${ticketUrl}" style="display:inline-block;padding:16px 32px;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Set up my password</a></td></tr></table><p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px;">Use this email address to sign up: <strong style="color:#fff;">${recipientEmail}</strong>. The link is single-use and tied to your invite.</p><hr style="border:none;border-top:1px solid #1f2937;margin:32px 0 16px;"><p style="color:#6b7280;font-size:11px;line-height:1.6;margin:0;">If you weren't expecting this, you can ignore the email — nothing happens unless you click the link.<br>— LME</p></td></tr></table></td></tr></table></body></html>`;
}

export const createInvitation = action({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    invitedBy: v.string(),
  },
  handler: async (ctx, { email, firstName, invitedBy }) => {
    const lowered = email.trim().toLowerCase();
    if (!lowered.includes("@")) throw new Error("Invalid email");

    // 1. Clerk: create the invitation; this generates a __clerk_ticket
    const r = await fetch(`${CLERK_API}/invitations`, {
      method: "POST",
      headers: clerkHeaders(),
      body: JSON.stringify({
        email_address: lowered,
        redirect_url: `${SITE_URL}/admin/sign-up`,
        public_metadata: firstName ? { firstName } : {},
        notify: false,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => null);
      throw new Error(err?.errors?.[0]?.message ?? `Clerk API ${r.status}`);
    }
    const inv = (await r.json()) as { id: string; url: string };

    // 2. Convex: record the invitation
    await ctx.runMutation(api.invitations.insertInvitation, {
      email: lowered,
      firstName,
      clerkInvitationId: inv.id,
      invitedBy,
    });

    // 3. Resend: send the LME-branded email with the ticket URL as the CTA
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);
    const html = inviteEmailHtml(invitedBy, firstName, inv.url, lowered);
    const sendResult = await resend.emails.send({
      from: `LME <${FROM}>`,
      to: [lowered],
      subject: "You're in — set up your LME admin password",
      html,
    });
    if (sendResult.error) {
      throw new Error(`Resend error: ${sendResult.error.message}`);
    }
    return { invitationId: inv.id, messageId: sendResult.data?.id };
  },
});
