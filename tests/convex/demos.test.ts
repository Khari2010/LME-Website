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

describe("demos", () => {
  test("create + list", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.demos.create, {
      title: "Live mix Aug 2026",
      url: "https://soundcloud.com/x",
      tags: ["live", "summer"],
    });
    const all = await t.query(api.demos.list, {});
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Live mix Aug 2026");
  });

  test("create rejects empty url", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.demos.create, {
        title: "X",
        url: "  ",
        tags: [],
      }),
    ).rejects.toThrow("url required");
  });

  test("setArchived hides from default list", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.demos.create, {
      title: "X",
      url: "https://x.com",
      tags: [],
    });
    await t.mutation(api.demos.setArchived, { id, archived: true });
    expect(await t.query(api.demos.list, {})).toHaveLength(0);
    expect(
      await t.query(api.demos.list, { includeArchived: true }),
    ).toHaveLength(1);
  });

  test("update patches fields", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.demos.create, {
      title: "X",
      url: "https://x.com",
      tags: [],
    });
    await t.mutation(api.demos.update, {
      id,
      patch: { title: "Y", tags: ["new"] },
    });
    const all = await t.query(api.demos.list, {});
    expect(all[0].title).toBe("Y");
    expect(all[0].tags).toEqual(["new"]);
  });
});
