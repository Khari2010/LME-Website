import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

// Pass the module map explicitly so convex-test doesn't rely on its own
// `import.meta.glob` (which only works when convex-test itself is transformed
// by Vite). Mirrors the pattern used in the other test files.
const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob("../../convex/**/*.*s");

describe("songs", () => {
  test("create + list", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.songs.create, {
      title: "Crazy in Love",
      artist: "Beyoncé",
      songKey: "F minor",
      bpm: 99,
      lead: "Reuben",
      genres: ["RnB"],
      demoLinks: ["https://soundcloud.com/x"],
    });
    await t.mutation(api.songs.create, {
      title: "Essence",
      artist: "Wizkid",
      genres: ["Afrobeats"],
      demoLinks: [],
    });
    const songs = await t.query(api.songs.list, {});
    expect(songs).toHaveLength(2);
  });

  test("create rejects empty title", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.songs.create, {
        title: "  ",
        genres: [],
        demoLinks: [],
      }),
    ).rejects.toThrow("title required");
  });

  test("setArchived hides song from default list", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.songs.create, {
      title: "Old Song",
      genres: [],
      demoLinks: [],
    });
    await t.mutation(api.songs.setArchived, { id, archived: true });
    const visible = await t.query(api.songs.list, {});
    expect(visible).toHaveLength(0);
    const all = await t.query(api.songs.list, { includeArchived: true });
    expect(all).toHaveLength(1);
  });

  test("update patches fields", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.songs.create, {
      title: "X",
      genres: [],
      demoLinks: [],
    });
    await t.mutation(api.songs.update, {
      id,
      patch: { bpm: 120, lead: "Reuben" },
    });
    const song = await t.query(api.songs.getById, { id });
    expect(song?.bpm).toBe(120);
    expect(song?.lead).toBe("Reuben");
  });
});
