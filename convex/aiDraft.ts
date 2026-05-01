"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are an email copywriter for LME (Live Music Enhancers), a Birmingham-based live band and event brand.

LME brand voice: Direct, slang-forward but readable. Energetic and cultural. Like texting mates about a sick night but your manager might read it too.
Use words like: vibes, energy, function, live & direct, different, no dead vibes.
Never use: bespoke, tailored, solutions, corporate, synergy.

Write email body copy only. No subject line. No "Dear subscriber". Start strong — first line should hook immediately.
Keep it punchy. Short paragraphs. Energy throughout. Sign off as Chris from LME.
Use the tone and audience context provided. The email will have an automatic unsubscribe link added at the bottom.`;

export const generateEmailDraft = action({
  args: {
    description: v.string(),
    audience: v.string(),
    tone: v.string(),
  },
  handler: async (_ctx, { description, audience, tone }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it via `pnpm dlx convex env set ANTHROPIC_API_KEY <key>`.",
      );
    }
    const client = new Anthropic({ apiKey });

    const userPrompt = `Write an LME email about: ${description}

Audience: ${audience}
Tone: ${tone}

Write the full email body. Make it feel alive — this should feel like it came from a real person, not a marketing tool.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract text from the response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Empty response from Claude");
    }
    return { text: textBlock.text };
  },
});
