import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

// Same module-glob trick used elsewhere in the suite — see contacts.test.ts.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

describe("suppression", () => {
  test("markBouncedByEmail flips status + appends note", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        email: "user@example.com",
        source: "manual",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      });
    });
    await t.mutation(internal.contacts.markBouncedByEmail, {
      email: "user@example.com",
      reason: "550 mailbox not found",
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c?.status).toBe("bounced");
    expect(c?.notes).toContain("Auto-suppressed: hard bounce");
  });

  test("markComplainedByEmail flips status to unsubscribed", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        email: "spam-flagger@example.com",
        source: "manual",
        tags: [],
        status: "active",
        signupDate: Date.now(),
      });
    });
    await t.mutation(internal.contacts.markComplainedByEmail, {
      email: "spam-flagger@example.com",
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c?.status).toBe("unsubscribed");
    expect(c?.notes).toContain("spam complaint");
  });

  test("markBouncedByEmail is idempotent", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run(async (ctx) => {
      return await ctx.db.insert("contacts", {
        email: "x@y.com",
        source: "manual",
        tags: [],
        status: "bounced",
        signupDate: Date.now(),
        notes: "[Auto-suppressed: hard bounce on 2026-01-01]",
      });
    });
    await t.mutation(internal.contacts.markBouncedByEmail, { email: "x@y.com" });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c?.status).toBe("bounced");
    // Note shouldn't be appended a second time:
    const noteCount = (c?.notes ?? "").match(/Auto-suppressed: hard bounce/g)
      ?.length ?? 0;
    expect(noteCount).toBe(1);
  });

  test("markBouncedByEmail with unknown email is a no-op (no throw)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.contacts.markBouncedByEmail, {
        email: "unknown@example.com",
      }),
    ).resolves.toBeNull();
  });
});
