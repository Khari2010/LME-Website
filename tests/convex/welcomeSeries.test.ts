import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

// Same module-glob trick used elsewhere in the suite — see contacts.test.ts.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

async function seed(t: ReturnType<typeof convexTest>) {
  await t.mutation(internal.welcomeSeries.seedDefaultSeries, {});
}

describe("welcomeSeries", () => {
  test("seedDefaultSeries inserts 3 active steps once (idempotent)", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const steps = await t.query(api.welcomeSeries.listSteps, {});
    expect(steps).toHaveLength(3);
    expect(steps.every((s) => s.active === true)).toBe(true);
    // re-running seed is a no-op
    await seed(t);
    const after = await t.query(api.welcomeSeries.listSteps, {});
    expect(after).toHaveLength(3);
  });

  test("enrollContact creates an enrollment with first step due now", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const contactId = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "fan@example.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
        firstName: "Fan",
      }),
    );
    await t.mutation(internal.welcomeSeries.enrollContact, { contactId });
    const enrollments = await t.run((ctx) =>
      ctx.db.query("welcomeSeriesEnrollments").collect(),
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].nextStepIndex).toBe(0);
    // Day 0 step has delayDays=0 so nextStepDueAt should be ~now
    expect(enrollments[0].nextStepDueAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test("enrollContact is idempotent — second call no-ops", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const contactId = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "x@y.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      }),
    );
    await t.mutation(internal.welcomeSeries.enrollContact, { contactId });
    await t.mutation(internal.welcomeSeries.enrollContact, { contactId });
    const enrollments = await t.run((ctx) =>
      ctx.db.query("welcomeSeriesEnrollments").collect(),
    );
    expect(enrollments).toHaveLength(1);
  });

  test("advanceEnrollment moves to step 1 with correct due date", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const contactId = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "a@b.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      }),
    );
    await t.mutation(internal.welcomeSeries.enrollContact, { contactId });
    const enrollment = await t.run((ctx) =>
      ctx.db.query("welcomeSeriesEnrollments").first(),
    );
    await t.mutation(internal.welcomeSeries.advanceEnrollment, {
      enrollmentId: enrollment!._id,
    });
    const after = await t.run((ctx) => ctx.db.get(enrollment!._id));
    expect(after?.nextStepIndex).toBe(1);
    // Step 1 has delayDays=3 → due 3 days from now
    const expected = Date.now() + 3 * 24 * 60 * 60 * 1000;
    expect(Math.abs((after?.nextStepDueAt ?? 0) - expected)).toBeLessThan(2000);
  });

  test("advanceEnrollment past last step marks completedAt", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const contactId = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "z@y.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      }),
    );
    await t.mutation(internal.welcomeSeries.enrollContact, { contactId });
    const enrollment = await t.run((ctx) =>
      ctx.db.query("welcomeSeriesEnrollments").first(),
    );
    // Advance 3 times (steps 0 → 1 → 2 → done)
    await t.mutation(internal.welcomeSeries.advanceEnrollment, {
      enrollmentId: enrollment!._id,
    });
    await t.mutation(internal.welcomeSeries.advanceEnrollment, {
      enrollmentId: enrollment!._id,
    });
    await t.mutation(internal.welcomeSeries.advanceEnrollment, {
      enrollmentId: enrollment!._id,
    });
    const after = await t.run((ctx) => ctx.db.get(enrollment!._id));
    expect(after?.completedAt).toBeDefined();
  });

  test("cancelForContact stops further sends", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const contactId = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "q@r.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      }),
    );
    await t.mutation(internal.welcomeSeries.enrollContact, { contactId });
    await t.mutation(internal.welcomeSeries.cancelForContact, { contactId });
    const enrollment = await t.run((ctx) =>
      ctx.db.query("welcomeSeriesEnrollments").first(),
    );
    expect(enrollment?.cancelledAt).toBeDefined();
  });

  test("upsertStep replaces existing template by (seriesKey, stepIndex)", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await t.mutation(api.welcomeSeries.upsertStep, {
      seriesKey: "enhancers-default",
      stepIndex: 0,
      delayDays: 0,
      subject: "New subject",
      bodyHtml: "<p>new</p>",
      active: true,
    });
    const steps = await t.query(api.welcomeSeries.listSteps, {});
    const step0 = steps.find((s) => s.stepIndex === 0);
    expect(step0?.subject).toBe("New subject");
    // Still 3 steps total (we updated, not inserted)
    expect(steps).toHaveLength(3);
  });

  test("listDueEnrollments returns only past-due, active enrollments", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const contactA = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "a@a.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      }),
    );
    const contactB = await t.run((ctx) =>
      ctx.db.insert("contacts", {
        email: "b@b.com",
        source: "enhancers-signup",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      }),
    );
    // A — enrolled normally (step 0 with delayDays=0 → due now)
    await t.mutation(internal.welcomeSeries.enrollContact, {
      contactId: contactA,
    });
    // B — enrolled, then cancelled (should NOT appear in due list)
    await t.mutation(internal.welcomeSeries.enrollContact, {
      contactId: contactB,
    });
    await t.mutation(internal.welcomeSeries.cancelForContact, {
      contactId: contactB,
    });

    const due = await t.query(api.welcomeSeries.listDueEnrollments, {});
    expect(due).toHaveLength(1);
    expect(due[0].contactId).toBe(contactA);
  });
});
