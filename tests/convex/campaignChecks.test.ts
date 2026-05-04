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

async function makeDraft(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{ subjectLine: string; bodyHtml: string }> = {},
): Promise<Id<"campaigns">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("campaigns", {
      status: "draft",
      subjectLine: overrides.subjectLine ?? "Hello {{firstName}}",
      bodyHtml:
        overrides.bodyHtml ??
        '<p>Hi {{firstName}}, check out our latest</p><p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>',
    }),
  );
}

async function insertActiveContact(
  t: ReturnType<typeof convexTest>,
  email: string,
  tags: string[] = [],
) {
  await t.run(async (ctx) =>
    ctx.db.insert("contacts", {
      email,
      source: "manual",
      tags,
      status: "active",
      signupDate: Date.now(),
    }),
  );
}

describe("campaignChecks.runChecks", () => {
  it("clean campaign passes everything (with at least one active contact)", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t);
    await insertActiveContact(t, "a@b.com");
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it("flags unknown merge tag", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t, {
      bodyHtml: "<p>Hi {{badTag}}</p><p>unsubscribe</p>",
    });
    await insertActiveContact(t, "a@b.com");
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    const tagCheck = checks.find((c) => c.id === "merge-tags");
    expect(tagCheck?.passed).toBe(false);
    expect(tagCheck?.detail).toContain("badTag");
  });

  it("flags missing unsubscribe", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t, { bodyHtml: "<p>Hi {{firstName}}</p>" });
    await insertActiveContact(t, "a@b.com");
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    const unsub = checks.find((c) => c.id === "unsubscribe");
    expect(unsub?.passed).toBe(false);
  });

  it("flags zero recipients", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t);
    // No contacts inserted
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    const recipients = checks.find((c) => c.id === "recipients");
    expect(recipients?.passed).toBe(false);
  });

  it("recipientTags filters to matching contacts", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t);
    await insertActiveContact(t, "a@b.com", ["enhancers-fan"]);
    await insertActiveContact(t, "c@d.com", ["other-tag"]);
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: ["enhancers-fan"],
    });
    const recipients = checks.find((c) => c.id === "recipients");
    expect(recipients?.passed).toBe(true);
    expect(recipients?.detail).toContain("1 active");
  });

  it("flags bare braces typo", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t, {
      // `{{ firstname` is an obvious typo (missing close + lowercase) — orphan
      // brace pair detected.
      bodyHtml: "<p>Hi {{ firstname</p><p>unsubscribe</p>",
    });
    await insertActiveContact(t, "a@b.com");
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    const bare = checks.find((c) => c.id === "bare-braces");
    expect(bare?.passed).toBe(false);
  });

  it("flags empty subject + body", async () => {
    const t = convexTest(schema, modules);
    const id = await makeDraft(t, { subjectLine: "", bodyHtml: "" });
    await insertActiveContact(t, "a@b.com");
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    expect(checks.find((c) => c.id === "subject")?.passed).toBe(false);
    expect(checks.find((c) => c.id === "body")?.passed).toBe(false);
  });

  it("returns campaign-not-found marker for missing id", async () => {
    const t = convexTest(schema, modules);
    // Create + delete to get a valid-shape but nonexistent id.
    const id = await makeDraft(t);
    await t.run(async (ctx) => ctx.db.delete(id));
    const checks = await t.query(api.campaignChecks.runChecks, {
      campaignId: id,
      recipientTags: [],
    });
    expect(checks).toHaveLength(1);
    expect(checks[0].id).toBe("exists");
    expect(checks[0].passed).toBe(false);
  });
});
