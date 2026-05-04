import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Same module-glob trick used elsewhere in the suite — see contacts.test.ts.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

async function seedDraft(
  t: ReturnType<typeof convexTest>,
): Promise<Id<"campaigns">> {
  const r = await t.mutation(api.campaigns.saveDraft, {
    subject: "Test subject",
    preheader: "Test preheader",
    bodyHtml: "<p>Hello</p>",
    sentBy: "user_test",
  });
  return r.id as Id<"campaigns">;
}

describe("campaigns.scheduleSend", () => {
  it("flips draft to scheduled with scheduledAt", async () => {
    const t = convexTest(schema, modules);
    const id = await seedDraft(t);
    const future = Date.now() + 60_000;
    await t.mutation(api.campaigns.scheduleSend, {
      draftId: id,
      scheduledAt: future,
      recipientTags: ["test-tag"],
    });
    const c = await t.query(api.campaigns.getCampaign, { id });
    expect(c).not.toBeNull();
    expect(c?.status).toBe("scheduled");
    expect(c?.scheduledAt).toBe(future);
    expect(c?.recipientTags).toEqual(["test-tag"]);
  });

  it("rejects past scheduledAt", async () => {
    const t = convexTest(schema, modules);
    const id = await seedDraft(t);
    await expect(
      t.mutation(api.campaigns.scheduleSend, {
        draftId: id,
        scheduledAt: Date.now() - 1000,
        recipientTags: [],
      }),
    ).rejects.toThrow();
  });

  it("cancelSchedule reverts to draft", async () => {
    const t = convexTest(schema, modules);
    const id = await seedDraft(t);
    await t.mutation(api.campaigns.scheduleSend, {
      draftId: id,
      scheduledAt: Date.now() + 60_000,
      recipientTags: [],
    });
    await t.mutation(api.campaigns.cancelSchedule, { id });
    const c = await t.query(api.campaigns.getCampaign, { id });
    expect(c?.status).toBe("draft");
    expect(c?.scheduledAt).toBeUndefined();
  });

  it("listDueScheduled returns past-due scheduled campaigns", async () => {
    const t = convexTest(schema, modules);
    // Past-due: insert directly with status=scheduled + past scheduledAt to
    // bypass the future-only validation in scheduleSend.
    const pastId = await t.run(async (ctx) =>
      ctx.db.insert("campaigns", {
        status: "scheduled",
        subjectLine: "Past one",
        bodyHtml: "<p>past</p>",
        scheduledAt: Date.now() - 10_000,
      }),
    );
    // Future-scheduled via the public mutation.
    const futureDraft = await seedDraft(t);
    await t.mutation(api.campaigns.scheduleSend, {
      draftId: futureDraft,
      scheduledAt: Date.now() + 60_000,
      recipientTags: [],
    });

    const due = await t.query(api.campaigns.listDueScheduled, {});
    expect(due).toHaveLength(1);
    expect(due[0]._id).toBe(pastId);
  });
});
