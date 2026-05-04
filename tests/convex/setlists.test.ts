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

describe("setlists", () => {
  test("create + list + getById", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.setlists.create, {
      name: "Wedding default",
      purpose: "Wedding",
    });
    const all = await t.query(api.setlists.list, {});
    expect(all).toHaveLength(1);
    const one = await t.query(api.setlists.getById, { id });
    expect(one?.name).toBe("Wedding default");
    expect(one?.items).toEqual([]);
  });

  test("setItems renumbers and sorts", async () => {
    const t = convexTest(schema, modules);
    const setlistId = await t.mutation(api.setlists.create, { name: "X" });
    const songA = await t.mutation(api.songs.create, {
      title: "A",
      genres: [],
      demoLinks: [],
    });
    const songB = await t.mutation(api.songs.create, {
      title: "B",
      genres: [],
      demoLinks: [],
    });
    const songC = await t.mutation(api.songs.create, {
      title: "C",
      genres: [],
      demoLinks: [],
    });

    await t.mutation(api.setlists.setItems, {
      id: setlistId,
      items: [
        { order: 99, songId: songC, notes: "last" },
        { order: 1, songId: songA },
        { order: 5, songId: songB },
      ],
    });

    const sl = await t.query(api.setlists.getById, { id: setlistId });
    expect(sl?.items[0].songId).toBe(songA);
    expect(sl?.items[1].songId).toBe(songB);
    expect(sl?.items[2].songId).toBe(songC);
    // Renumbered to 0,1,2 regardless of what the client passed.
    expect(sl?.items.map((it: { order: number }) => it.order)).toEqual([
      0, 1, 2,
    ]);
  });

  test("create rejects empty name", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.setlists.create, { name: "  " }),
    ).rejects.toThrow("name required");
  });

  test("remove deletes the setlist", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.setlists.create, { name: "Doomed" });
    await t.mutation(api.setlists.remove, { id });
    const all = await t.query(api.setlists.list, {});
    expect(all).toHaveLength(0);
  });
});
