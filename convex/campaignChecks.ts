import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";

// Merge tags allowed in campaign subject/body. The send-time renderer in
// `campaignSender.ts` substitutes these per recipient (firstName/name/email
// from the contact row, unsubscribeUrl auto-injected). Anything else is a typo.
const ALLOWED_MERGE_TAGS = new Set([
  "firstName",
  "name",
  "email",
  "unsubscribeUrl",
]);

export type CheckResult = {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
};

/**
 * Run pre-send validation checks against a draft campaign + the contact list.
 *
 * Returns an array of pass/fail rows the UI renders as a checklist before the
 * "Send campaign" action actually fires. Pure V8 query — no link reachability
 * (would need a Node action) and no email rendering (already validated by the
 * "Send test" path).
 */
export const runChecks = query({
  args: {
    campaignId: v.id("campaigns"),
    recipientTags: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      passed: v.boolean(),
      detail: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return [
        {
          id: "exists",
          label: "Campaign exists",
          passed: false,
          detail: "Campaign not found",
        },
      ];
    }

    const checks: Array<{
      id: string;
      label: string;
      passed: boolean;
      detail?: string;
    }> = [];

    // 1. Subject non-empty
    const subjectOk = Boolean(campaign.subjectLine?.trim());
    checks.push({
      id: "subject",
      label: "Subject line filled",
      passed: subjectOk,
      detail: subjectOk ? undefined : "Subject is empty",
    });

    // 2. Body non-empty
    const bodyOk = Boolean(campaign.bodyHtml?.trim());
    checks.push({
      id: "body",
      label: "Body content present",
      passed: bodyOk,
      detail: bodyOk ? undefined : "Body is empty",
    });

    // 3. Merge tag validation — only allow {{firstName}}, {{name}}, {{email}},
    // {{unsubscribeUrl}}. Anything else is a typo.
    const combined = `${campaign.subjectLine ?? ""} ${campaign.bodyHtml ?? ""}`;
    const tagMatches = Array.from(
      combined.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g),
    ).map((m) => m[1]);
    const unknownTags = tagMatches.filter((t) => !ALLOWED_MERGE_TAGS.has(t));
    checks.push({
      id: "merge-tags",
      label: "Merge tags valid",
      passed: unknownTags.length === 0,
      detail:
        unknownTags.length > 0
          ? `Unknown: ${[...new Set(unknownTags)].join(", ")}`
          : undefined,
    });

    // 4. Bare braces — orphan `{{` / `}}` not part of a valid tag.
    const body = campaign.bodyHtml ?? "";
    const totalOpens = (body.match(/\{\{/g) ?? []).length;
    const totalCloses = (body.match(/\}\}/g) ?? []).length;
    // Count valid tag pairs in body only (subject is small + tag matches above
    // include both — but for orphan detection in body we use body counts).
    const bodyTagPairs = Array.from(
      body.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g),
    ).length;
    const orphans = Math.max(totalOpens, totalCloses) - bodyTagPairs;
    checks.push({
      id: "bare-braces",
      label: "No bare {{ }} braces",
      passed: orphans <= 0,
      detail: orphans > 0 ? `${orphans} possible typo(s)` : undefined,
    });

    // 5. Unsubscribe reference — body should mention unsubscribe somehow. The
    // actual link gets auto-injected per recipient at send time, but the body
    // should reference it (token or text).
    const hasUnsubRef =
      body.includes("{{unsubscribeUrl}}") || /unsubscribe/i.test(body);
    checks.push({
      id: "unsubscribe",
      label: "Unsubscribe reference present",
      passed: hasUnsubRef,
      detail: hasUnsubRef
        ? undefined
        : "No unsubscribe link or text in the body",
    });

    // 6. Recipients available — at least one active contact matches.
    const allContacts = await ctx.db.query("contacts").collect();
    const activeMatching = allContacts.filter((c) => {
      if (c.status !== "active") return false;
      if (args.recipientTags.length === 0) return true; // "all active"
      return args.recipientTags.some((t) => c.tags.includes(t));
    });
    checks.push({
      id: "recipients",
      label: "Recipients available",
      passed: activeMatching.length > 0,
      detail: `${activeMatching.length} active contact(s) match`,
    });

    return checks;
  },
});
