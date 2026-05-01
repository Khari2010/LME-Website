"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Resend } from "resend";
import { render } from "@react-email/components";
import EnhancerWelcome from "../src/emails/EnhancerWelcome";
import React from "react";

export const sendEnhancerWelcomeEmail = internalAction({
  args: {
    contactId: v.id("contacts"),
    token: v.string(),
    isNewSignup: v.boolean(),
  },
  handler: async (ctx, { contactId, token, isNewSignup }) => {
    const contact = await ctx.runQuery(api.contacts.getContactById, {
      id: contactId,
    });
    if (!contact) {
      throw new Error("Contact not found");
    }

    const baseUrl = process.env.SITE_URL ?? "https://lmeband.com";
    const magicLinkUrl = `${baseUrl}/enhancers/auth?token=${token}`;

    const html = await render(
      React.createElement(EnhancerWelcome, { magicLinkUrl, isNewSignup }),
    );

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.ENHANCERS_FROM_ADDRESS ?? "enhancers@lmeband.com";
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    const resend = new Resend(apiKey);
    const subject = isNewSignup
      ? "You're in — welcome to the Enhancers"
      : "Your Enhancers link";

    const result = await resend.emails.send({
      from: `LME Enhancers <${fromAddress}>`,
      to: [contact.email],
      subject,
      html,
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }

    return { messageId: result.data?.id };
  },
});
