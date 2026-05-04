import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Same module-glob trick used elsewhere in the suite — see contacts.test.ts.
const modules = (
  import.meta as ImportMeta & {
    glob: (pattern: string) => Record<string, () => Promise<unknown>>;
  }
).glob("../../convex/**/*.*s");

describe("contentPlanner.listEntries", () => {
  test("returns sent + scheduled campaigns within date range", async () => {
    const t = convexTest(schema, modules);
    const inRange = new Date("2026-07-15").getTime();
    const outOfRange = new Date("2027-01-15").getTime();

    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "sent",
        subjectLine: "In range sent",
        bodyHtml: "<p>x</p>",
        sentDate: inRange,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "scheduled",
        subjectLine: "In range scheduled",
        bodyHtml: "<p>x</p>",
        scheduledAt: inRange + 1000,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "sent",
        subjectLine: "Out of range",
        bodyHtml: "<p>x</p>",
        sentDate: outOfRange,
      }),
    );

    const entries = await t.query(api.contentPlanner.listEntries, {
      from: new Date("2026-07-01").getTime(),
      to: new Date("2026-08-01").getTime(),
    });

    const titles = entries.map((e) => e.title).sort();
    expect(titles).toEqual(["In range scheduled", "In range sent"]);
  });

  test("does not include drafts", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "draft",
        subjectLine: "A draft",
        bodyHtml: "<p>x</p>",
      }),
    );
    const entries = await t.query(api.contentPlanner.listEntries, {
      from: 0,
      to: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    expect(entries).toHaveLength(0);
  });

  test("sets href on campaign entries pointing to compose with id", async () => {
    const t = convexTest(schema, modules);
    const sentAt = new Date("2026-07-15").getTime();
    const id = await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "sent",
        subjectLine: "Click me",
        bodyHtml: "<p>x</p>",
        sentDate: sentAt,
      }),
    );
    const entries = await t.query(api.contentPlanner.listEntries, {
      from: new Date("2026-07-01").getTime(),
      to: new Date("2026-08-01").getTime(),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("campaign");
    expect(entries[0].status).toBe("sent");
    expect(entries[0].href).toBe(`/admin/marketing/compose?id=${id}`);
  });
});

describe("contentPlanner.listDrafts", () => {
  test("returns only drafts", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "draft",
        subjectLine: "Draft A",
        bodyHtml: "<p>x</p>",
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        status: "sent",
        subjectLine: "Sent A",
        bodyHtml: "<p>x</p>",
        sentDate: Date.now(),
      }),
    );
    const drafts = await t.query(api.contentPlanner.listDrafts, {});
    expect(drafts).toHaveLength(1);
    expect(drafts[0].subjectLine).toBe("Draft A");
  });
});
