import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// See note in songs.test.ts — pass the module map explicitly so convex-test
// doesn't rely on its own `import.meta.glob` (which only works when convex-test
// itself is transformed by Vite).
const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob("../../convex/**/*.*s");

describe("transcriptExtraction.extractFromTranscript", () => {
  async function setupEvent(
    t: ReturnType<typeof convexTest>,
    transcript: string,
  ) {
    const id = await t.mutation(api.events.create, {
      name: "Sunday Catchup",
      type: "Meeting",
      family: "TeamDiary",
      status: "Scheduled",
      startDate: Date.now(),
      isAllDay: false,
    });
    await t.mutation(api.meetingDetails.setMeetingDetails, {
      id,
      details: { attendees: [], transcript, decisions: [], actions: [] },
    });
    return id;
  }

  test("extracts action lines starting with action verbs", async () => {
    const t = convexTest(schema, modules);
    const id = await setupEvent(
      t,
      `
Send the contract to Bria today.
Schedule the photographer for Saturday.
Random chatter that should not be picked up.
- Follow up with Stacey about the décor team
    `.trim(),
    );
    const result = await t.mutation(
      api.transcriptExtraction.extractFromTranscript,
      { id },
    );
    expect(result.actionsAdded).toBe(3);
    const event = await t.query(api.events.getById, { id });
    expect(
      event?.meetingDetails?.actions.map(
        (a: { description: string }) => a.description,
      ),
    ).toEqual([
      "Send the contract to Bria today.",
      "Schedule the photographer for Saturday.",
      "Follow up with Stacey about the décor team",
    ]);
  });

  test("extracts decisions from agreed/decided patterns", async () => {
    const t = convexTest(schema, modules);
    const id = await setupEvent(
      t,
      `
Decision: After Dark stays at Mamas.
Agreed: ticket prices stay the same for now.
We'll move the rehearsal to Wednesday.
    `.trim(),
    );
    const result = await t.mutation(
      api.transcriptExtraction.extractFromTranscript,
      { id },
    );
    expect(result.decisionsAdded).toBe(3);
  });

  test("dedups against existing decisions/actions", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "X",
      type: "Meeting",
      family: "TeamDiary",
      status: "Scheduled",
      startDate: Date.now(),
      isAllDay: false,
    });
    await t.mutation(api.meetingDetails.setMeetingDetails, {
      id,
      details: {
        attendees: [],
        transcript: "Send invoice today.",
        decisions: [],
        actions: [{ description: "Send invoice today.", done: false }],
      },
    });
    const result = await t.mutation(
      api.transcriptExtraction.extractFromTranscript,
      { id },
    );
    expect(result.actionsAdded).toBe(0); // already present
  });

  test("rejects when no transcript", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "X",
      type: "Meeting",
      family: "TeamDiary",
      status: "Scheduled",
      startDate: Date.now(),
      isAllDay: false,
    });
    await expect(
      t.mutation(api.transcriptExtraction.extractFromTranscript, { id }),
    ).rejects.toThrow("no transcript");
  });

  test("rejects for non-TeamDiary events", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
    });
    await expect(
      t.mutation(api.transcriptExtraction.extractFromTranscript, { id }),
    ).rejects.toThrow("only Team Diary");
  });
});
