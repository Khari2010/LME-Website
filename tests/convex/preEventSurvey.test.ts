import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Pass the module map explicitly so convex-test doesn't rely on its own
// `import.meta.glob` (which only works when convex-test itself is transformed
// by Vite). Mirrors the pattern used by the other test files in this dir.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

describe("preEventSurvey.sendSurvey", () => {
  test("rejects when status isn't Booked/PreEvent", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Inquiry",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });
    await expect(
      t.mutation(api.preEventSurvey.sendSurvey, { id }),
    ).rejects.toThrow("send survey only after deposit is paid");
  });

  test("advances status to PreEvent + sets requestedAt", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });

    const result = await t.mutation(api.preEventSurvey.sendSurvey, { id });
    expect(result.token).toMatch(/^[0-9a-f]+$/);
    expect(result.token.length).toBeGreaterThanOrEqual(32);
    expect(result.portalUrl).toContain("/pre-event");
    expect(result.portalUrl).toContain(result.token);

    const event = await t.query(api.events.getById, { id });
    expect(event?.status).toBe("PreEvent");
    expect(event?.nextActionLabel).toContain("pre-event details");
    const survey = event?.preEventSurvey as
      | { requestedAt?: number }
      | undefined;
    expect(survey?.requestedAt).toBeDefined();
    expect(typeof survey?.requestedAt).toBe("number");
  });
});

describe("preEventSurvey.submitSurvey", () => {
  test("writes survey data + sets submittedAt", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.events.create, {
      name: "Test Wedding",
      type: "Wedding",
      family: "ExternalBooking",
      status: "Booked",
      startDate: Date.now(),
      isAllDay: true,
      client: { name: "Test Client", email: "test@example.com" },
    });
    const { token } = await t.mutation(api.preEventSurvey.sendSurvey, { id });

    await t.mutation(api.preEventSurvey.submitSurvey, {
      token,
      genrePreferences: ["Afrobeats", "RnB 2000s"],
      mustPlays: ["Wizkid — Essence", "Beyoncé — Crazy in Love"],
      doNotPlays: ["No country"],
      finalStartTime: "20:30",
      finalEndTime: "21:30",
      dayOfContactName: "Sarah",
      dayOfContactPhone: "07700 900000",
      notes: "We'd love a Drake medley if possible",
    });

    const event = await t.query(api.events.getById, { id });
    const survey = event?.preEventSurvey as
      | {
          submittedAt?: number;
          genrePreferences?: string[];
          mustPlays?: string[];
          doNotPlays?: string[];
          finalStartTime?: string;
          finalEndTime?: string;
          dayOfContactName?: string;
          dayOfContactPhone?: string;
          notes?: string;
        }
      | undefined;
    expect(survey?.submittedAt).toBeDefined();
    expect(survey?.genrePreferences).toEqual(["Afrobeats", "RnB 2000s"]);
    expect(survey?.mustPlays?.length).toBe(2);
    expect(survey?.doNotPlays).toEqual(["No country"]);
    expect(survey?.finalStartTime).toBe("20:30");
    expect(survey?.finalEndTime).toBe("21:30");
    expect(survey?.dayOfContactName).toBe("Sarah");
    expect(survey?.dayOfContactPhone).toBe("07700 900000");
    expect(survey?.notes).toContain("Drake medley");
  });

  test("rejects with invalid token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.preEventSurvey.submitSurvey, {
        token: "fake",
        genrePreferences: [],
        mustPlays: [],
        doNotPlays: [],
      }),
    ).rejects.toThrow("invalid link");
  });
});
