import { mutation } from "./_generated/server";
import { v } from "convex/values";

// P4-T8: Auto-extract decisions + actions from a meeting transcript.
//
// Two paths are intended:
//  1. Heuristic — pure regex/keyword scan over the pasted transcript. Always
//     works, no API key, deterministic. This is what's implemented below.
//  2. LLM — gated by ANTHROPIC_API_KEY. Would call Claude Haiku to extract
//     structured decisions + actions. STUBBED for now; when wired, it would
//     live in a sibling Node action `convex/transcriptExtractionAction.ts`
//     (Convex requires `"use node"` for outbound HTTP calls), and this
//     mutation would defer to it when the env var is present. The mutation's
//     return type already carries a `method` discriminator so the UI can
//     surface which path ran.
//
// Both paths feed the same merge step: append-with-dedup against the existing
// decisions + actions arrays so a user can re-run extraction safely after
// editing the transcript without duplicating prior matches.

const ACTION_VERBS = [
  "send",
  "schedule",
  "follow up",
  "call",
  "set up",
  "review",
  "draft",
  "confirm",
  "check",
  "investigate",
  "pull",
  "finalise",
  "finalize",
  "raise",
  "scope",
  "sync",
  "research",
];

const DECISION_PATTERNS = [
  /^(decision|decided|agreed)[:\s]/i,
  /\bwe('ll| will|'ve agreed|'ve decided|'re going to)\b/i,
  /\bagreed:\s/i,
];

function extractFromLines(transcript: string): {
  decisions: string[];
  actions: string[];
} {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const decisions: string[] = [];
  const actions: string[] = [];

  for (const line of lines) {
    const isDecision = DECISION_PATTERNS.some((p) => p.test(line));
    if (isDecision) {
      decisions.push(
        line.replace(/^(decision|decided|agreed)[:\s]+/i, "").trim(),
      );
      continue;
    }
    // Action: line starts with a bullet/dash AND contains an action verb,
    // OR line starts with an action verb directly.
    const cleaned = line.replace(/^[-•*]\s*/, "").trim();
    const lower = cleaned.toLowerCase();
    const hasActionVerb = ACTION_VERBS.some(
      (verb) => lower.startsWith(verb) || lower.includes(` ${verb} `),
    );
    if (hasActionVerb && cleaned.length < 200) {
      actions.push(cleaned);
    }
  }

  return { decisions, actions };
}

export const extractFromTranscript = mutation({
  args: { id: v.id("events") },
  returns: v.object({
    decisionsAdded: v.number(),
    actionsAdded: v.number(),
    method: v.union(v.literal("heuristic"), v.literal("llm-stubbed")),
  }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    if (event.family !== "TeamDiary") {
      throw new Error("only Team Diary events have transcripts");
    }

    const md = event.meetingDetails;
    if (!md?.transcript) {
      throw new Error("no transcript to extract from");
    }

    // Heuristic-only for now (LLM path is stubbed — see comment at top).
    const { decisions, actions } = extractFromLines(md.transcript);

    // Append-with-dedup: skip anything that's already present
    // (case-insensitive match).
    const existingDecisions = new Set(
      (md.decisions ?? []).map((d) => d.toLowerCase()),
    );
    const existingActions = new Set(
      (md.actions ?? []).map((a) => a.description.toLowerCase()),
    );

    const newDecisions = decisions.filter(
      (d) => !existingDecisions.has(d.toLowerCase()),
    );
    const newActions = actions
      .filter((a) => !existingActions.has(a.toLowerCase()))
      .map((description) => ({ description, done: false }));

    await ctx.db.patch(args.id, {
      meetingDetails: {
        attendees: md.attendees,
        transcript: md.transcript,
        decisions: [...(md.decisions ?? []), ...newDecisions],
        actions: [...(md.actions ?? []), ...newActions],
      },
    });

    return {
      decisionsAdded: newDecisions.length,
      actionsAdded: newActions.length,
      // When the LLM stub lands, this will switch to "llm-stubbed" if
      // ANTHROPIC_API_KEY is set in the Convex env.
      method: "heuristic" as const,
    };
  },
});
