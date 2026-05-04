import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob("../../convex/**/*.*s");

describe("siteCopy", () => {
  test("getByKey returns null when missing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.siteCopy.getByKey, { key: "missing.key" });
    expect(result).toBeNull();
  });

  test("getByKey returns the value when present", async () => {
    const t = convexTest(schema, modules);
    // Seed directly to bypass the requireWrite("settings") gate.
    await t.run((ctx) =>
      ctx.db.insert("siteCopy", {
        key: "test.key",
        value: "Hello",
        updatedAt: Date.now(),
      }),
    );
    const result = await t.query(api.siteCopy.getByKey, { key: "test.key" });
    expect(result).toBe("Hello");
  });

  test("list returns all rows sorted by key", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("siteCopy", {
        key: "z.last",
        value: "Z",
        updatedAt: Date.now(),
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("siteCopy", {
        key: "a.first",
        value: "A",
        updatedAt: Date.now(),
      }),
    );
    const rows = await t.query(api.siteCopy.list, {});
    expect(rows.map((r: { key: string }) => r.key)).toEqual([
      "a.first",
      "z.last",
    ]);
  });
});
