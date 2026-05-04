"use node";

/**
 * P2-T4: Welcome series cron tick — runs hourly (registered in
 * `convex/crons.ts`). Picks up enrollments whose `nextStepDueAt <= now`,
 * sends the next step's email via Resend, and advances the enrollment.
 *
 * Failures for individual enrollments are logged but do not abort the loop —
 * the next tick will retry any enrollment still in active state. Successful
 * sends call `advanceEnrollment` which either schedules the next step or
 * marks the enrollment completed.
 */

import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

const FROM =
  process.env.WELCOME_FROM_ADDRESS ??
  process.env.ENHANCERS_FROM_ADDRESS ??
  "enhancers@lmeband.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyMergeTags(
  body: string,
  tags: {
    firstName: string;
    name: string;
    email: string;
    unsubscribeUrl: string;
  },
): string {
  return body
    .replace(/\{\{\s*firstName\s*\}\}/g, escapeHtml(tags.firstName))
    .replace(/\{\{\s*name\s*\}\}/g, escapeHtml(tags.name))
    .replace(/\{\{\s*email\s*\}\}/g, escapeHtml(tags.email))
    .replace(/\{\{\s*unsubscribeUrl\s*\}\}/g, tags.unsubscribeUrl);
}

type DueEnrollment = {
  _id: import("./_generated/dataModel").Id<"welcomeSeriesEnrollments">;
  contactId: import("./_generated/dataModel").Id<"contacts">;
  seriesKey: string;
  nextStepIndex: number;
};

type StepRow = {
  stepIndex: number;
  delayDays: number;
  subject: string;
  bodyHtml: string;
  active: boolean;
};

export const tick = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const due = (await ctx.runQuery(
      api.welcomeSeries.listDueEnrollments,
      {},
    )) as DueEnrollment[];

    if (!due.length) {
      console.log("[welcome-series] no due enrollments");
      return null;
    }

    console.log(`[welcome-series] ${due.length} due`);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[welcome-series] RESEND_API_KEY missing — skipping all sends");
      return null;
    }
    const resend = new Resend(apiKey);

    for (const enrollment of due) {
      try {
        // Fetch contact + step.
        const contact = await ctx.runQuery(api.contacts.getContactById, {
          id: enrollment.contactId,
        });
        if (!contact || contact.status !== "active") {
          // Contact gone or unsubscribed — cancel all their enrollments so we
          // don't keep picking this one up every tick.
          await ctx.runMutation(internal.welcomeSeries.cancelForContact, {
            contactId: enrollment.contactId,
          });
          continue;
        }
        const steps = (await ctx.runQuery(api.welcomeSeries.listSteps, {
          seriesKey: enrollment.seriesKey,
        })) as StepRow[];
        const step = steps.find(
          (s) => s.stepIndex === enrollment.nextStepIndex,
        );
        if (!step || !step.active) {
          // Step missing or disabled — advance (which marks complete if no
          // more active steps remain).
          await ctx.runMutation(internal.welcomeSeries.advanceEnrollment, {
            enrollmentId: enrollment._id,
          });
          continue;
        }

        const firstName =
          contact.firstName || contact.name?.split(" ")[0] || "there";
        const mergeCtx = {
          firstName,
          name: contact.name || firstName,
          email: contact.email,
          unsubscribeUrl: `https://www.lmeband.com/unsubscribe?token=${contact.unsubscribeToken ?? ""}`,
        };
        const body = applyMergeTags(step.bodyHtml, mergeCtx);
        const subject = applyMergeTags(step.subject, {
          ...mergeCtx,
          unsubscribeUrl: "",
        });

        await resend.emails.send({
          from: `LME <${FROM}>`,
          to: contact.email,
          subject,
          html: body,
        });

        await ctx.runMutation(internal.welcomeSeries.advanceEnrollment, {
          enrollmentId: enrollment._id,
        });
        console.log(
          `[welcome-series] sent step ${step.stepIndex} to ${contact.email}`,
        );
      } catch (err) {
        console.error(
          `[welcome-series] failed for enrollment ${enrollment._id}:`,
          err,
        );
      }
    }
    return null;
  },
});
