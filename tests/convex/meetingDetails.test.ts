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

describe("meetingDetails", () => {
  test("setMeetingDetails patches the sub-block", async () => {
    const t = convexTest(schema, modules);
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
      details: {
        attendees: ["Chris", "Khari"],
        transcript: "Chris: …",
        decisions: ["Move event to Sunday"],
        actions: [
          { description: "Send contract", assignee: "Khari", done: false },
        ],
      },
    });
    const event = await t.query(api.events.getById, { id });
    expect(event?.meetingDetails?.attendees).toEqual(["Chris", "Khari"]);
    expect(event?.meetingDetails?.decisions).toHaveLength(1);
    expect(event?.meetingDetails?.actions[0].assignee).toBe("Khari");
  });

  test("rejects when family is not TeamDiary", async () => {
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
      t.mutation(api.meetingDetails.setMeetingDetails, {
        id,
        details: { attendees: [], decisions: [], actions: [] },
      }),
    ).rejects.toThrow("only Team Diary");
  });
});
