"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

const FROM = process.env.ENHANCERS_FROM_ADDRESS ?? "enhancers@lmeband.com";
const SITE_URL = process.env.SITE_URL ?? "https://www.lmeband.com";

export const sendTeamInvite = action({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    invitedBy: v.string(),
  },
  handler: async (_ctx, { email, firstName, invitedBy }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(apiKey);
    const greeting = firstName ? `Hey ${firstName},` : "Hey,";
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#080808;font-family:Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080808"><tr><td align="center" style="padding:40px 24px;"><table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td><p style="color:#14B8A6;font-size:14px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 16px;">LME · Admin</p><h1 style="color:#ffffff;font-size:36px;font-weight:700;margin:0 0 16px;line-height:1.1;">You're in.</h1><p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 16px;">${greeting} ${invitedBy} just added you to the LME admin platform — replacing MailChimp + giving the band a proper home for campaigns, contacts, bookings, and more.</p><p style="color:#9ca3af;font-size:16px;line-height:1.6;margin:0 0 32px;">Click below to set up your password and get in.</p><table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="background-color:#14B8A6;border-radius:6px;"><a href="${SITE_URL}/admin/sign-up" style="display:inline-block;padding:16px 32px;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Set up my password</a></td></tr></table><p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px;">Use this email address to sign up: <strong style="color:#fff;">${email}</strong>. Anything else won't work — the system is invite-only.</p><hr style="border:none;border-top:1px solid #1f2937;margin:32px 0 16px;"><p style="color:#6b7280;font-size:11px;line-height:1.6;margin:0;">If you weren't expecting this, you can ignore the email — nothing happens unless you click the link and set a password.<br>— LME</p></td></tr></table></td></tr></table></body></html>`;
    const result = await resend.emails.send({
      from: `LME <${FROM}>`,
      to: [email],
      subject: "You're in — set up your LME admin password",
      html,
    });
    if (result.error) throw new Error(`Resend error: ${result.error.message}`);
    return { messageId: result.data?.id };
  },
});
