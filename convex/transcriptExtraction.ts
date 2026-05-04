import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// P4-T8 / P6-T5: Auto-extract decisions + actions from a meeting transcript.
//
// Two paths exist:
//  1. Heuristic — pure regex/keyword scan over the pasted transcript. Always
//     works, no API key, deterministic. Runs synchronously inside the mutation.
//  2. LLM — gated by ANTHROPIC_API_KEY. Schedules
//     `transcriptExtractionAction.extractWithLlm` (a Node action), which calls
//     Claude Haiku and then invokes `mergeExtracted` (an internal mutation in
//     this file) to merge the parsed decisions + actions into the event.
//
// Both paths feed the same merge logic: append-with-dedup against the existing
// decisions + actions arrays so a user can re-run extraction safely after
// editing the transcript without duplicating prior matches. The heuristic path
// inlines the merge (V8 mutations can't directly call other V8 mutations), and
// the LLM path goes through the action's `runMutation(internal.* ).

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

/**
 * P6-T5: Merge LLM-extracted decisions + actions into an event's
 * meetingDetails. Called from `transcriptExtractionAction.extractWithLlm`
 * after the model returns. Uses the same dedup-and-append logic as the
 * heuristic path.
 */
export const mergeExtracted = internalMutation({
  args: {
    eventId: v.id("events"),
    decisions: v.array(v.string()),
    actions: v.array(
      v.object({
        description: v.string(),
        assignee: v.optional(v.string()),
      }),
    ),
    method: v.union(v.literal("heuristic"), v.literal("llm")),
  },
  returns: v.object({
    decisionsAdded: v.number(),
    actionsAdded: v.number(),
  }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return { decisionsAdded: 0, actionsAdded: 0 };
    const md = event.meetingDetails;
    if (!md) return { decisionsAdded: 0, actionsAdded: 0 };

    const existingDecisions = new Set(
      (md.decisions ?? []).map((d) => d.toLowerCase()),
    );
    const existingActions = new Set(
      (md.actions ?? []).map((a) => a.description.toLowerCase()),
    );

    const newDecisions = args.decisions.filter(
      (d) => !existingDecisions.has(d.toLowerCase()),
    );
    const newActionRows = args.actions
      .filter((a) => !existingActions.has(a.description.toLowerCase()))
      .map((a) => ({
        description: a.description,
        assignee: a.assignee,
        done: false,
      }));

    await ctx.db.patch(args.eventId, {
      meetingDetails: {
        attendees: md.attendees,
        transcript: md.transcript,
        decisions: [...(md.decisions ?? []), ...newDecisions],
        actions: [...(md.actions ?? []), ...newActionRows],
      },
    });

    return {
      decisionsAdded: newDecisions.length,
      actionsAdded: newActionRows.length,
    };
  },
});

export const extractFromTranscript = mutation({
  args: { id: v.id("events") },
  returns: v.object({
    decisionsAdded: v.number(),
    actionsAdded: v.number(),
    method: v.union(
      v.literal("heuristic"),
      v.literal("llm-stubbed"),
      v.literal("llm-pending"),
    ),
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

    // P6-T5: When ANTHROPIC_API_KEY is set in the Convex env, route to the
    // Node action which uses Claude Haiku to extract structured decisions +
    // actions. The action runs async; the UI re-fetches after a short delay
    // (see EventDetail's window.location.reload after the call returns) and
    // picks up the merged results.
    if (process.env.ANTHROPIC_API_KEY) {
      await ctx.scheduler.runAfter(
        0,
        internal.transcriptExtractionAction.extractWithLlm,
        {
          eventId: args.id,
          transcript: md.transcript,
        },
      );
      return {
        decisionsAdded: 0,
        actionsAdded: 0,
        method: "llm-pending" as const,
      };
    }

    // Heuristic path — synchronous, inline merge (V8 mutations can't call
    // other V8 mutations directly; mergeExtracted is reserved for the
    // action's runMutation call).
    const { decisions, actions } = extractFromLines(md.transcript);

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
      method: "heuristic" as const,
    };
  },
});
