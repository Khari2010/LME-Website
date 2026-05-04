"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

/**
 * P6-T5: LLM-powered transcript extraction. Scheduled by
 * `transcriptExtraction.extractFromTranscript` when ANTHROPIC_API_KEY is set
 * in the Convex env. Calls Claude Haiku to produce structured decisions +
 * actions, then merges them into the event's meetingDetails via
 * `transcriptExtraction.mergeExtracted` (which uses the same dedup-and-
 * append logic as the heuristic path).
 *
 * Errors are logged and swallowed — the action is best-effort. If the LLM
 * call fails or the response is malformed, the event is left untouched and
 * the admin can fall back to the heuristic path by unsetting the env var.
 */
export const extractWithLlm = internalAction({
  args: {
    eventId: v.id("events"),
    transcript: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Defensive — caller should already have checked. Bail without writing.
      console.warn("[transcript-llm] ANTHROPIC_API_KEY missing");
      return null;
    }

    const client = new Anthropic({ apiKey });

    const prompt = `Extract decisions and actions from the meeting transcript below.

A "decision" is a finalised choice the team has made (e.g. "After Dark stays at Mamas").
An "action" is something a specific person needs to do (e.g. "Khari to send the contract").

Output JSON only, in this exact format:
{
  "decisions": ["First decision", "Second decision"],
  "actions": [
    { "description": "What needs doing", "assignee": "Person name or null" }
  ]
}

Transcript:
---
${args.transcript.slice(0, 30_000)}
---`;

    let parsed: {
      decisions: string[];
      actions: Array<{ description: string; assignee: string | null }>;
    };
    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      const text =
        response.content[0]?.type === "text" ? response.content[0].text : "";
      // Strip markdown code-fence if present
      const jsonStr = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed.decisions) || !Array.isArray(parsed.actions)) {
        throw new Error("malformed response");
      }
    } catch (err) {
      console.error("[transcript-llm] failed:", err);
      return null;
    }

    await ctx.runMutation(internal.transcriptExtraction.mergeExtracted, {
      eventId: args.eventId,
      decisions: parsed.decisions,
      actions: parsed.actions.map((a) => ({
        description: a.description,
        assignee: a.assignee ?? undefined,
      })),
      method: "llm",
    });
    return null;
  },
});
