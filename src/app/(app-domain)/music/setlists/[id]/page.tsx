"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";

type Item = {
  songId: Id<"songs"> | "";
  notes: string;
};

type SongOption = {
  _id: string;
  title: string;
  artist?: string;
};

type SetlistItem = {
  order: number;
  songId: Id<"songs">;
  notes?: string;
};

export default function SetlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const setlist = useQuery(api.setlists.getById, {
    id: id as Id<"setlists">,
  });
  const songs = useQuery(api.songs.list, {});
  const updateMeta = useMutation(api.setlists.updateMeta);
  const setItemsMutation = useMutation(api.setlists.setItems);
  const remove = useMutation(api.setlists.remove);

  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  // P6-T3: drop-target highlight index for native HTML5 drag-and-drop.
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load fields from server only when the setlist's identity changes — we
  // don't want to clobber the user's in-flight edits every time the live
  // query re-fires (Convex resubscribes on every mutation).
  useEffect(() => {
    if (setlist) {
      setName(setlist.name);
      setPurpose(setlist.purpose ?? "");
      setItems(
        setlist.items.map((it: SetlistItem) => ({
          songId: it.songId,
          notes: it.notes ?? "",
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setlist?._id]);

  if (setlist === undefined)
    return <p className="text-sm text-text-muted">Loading…</p>;
  if (!setlist)
    return <p className="text-sm text-danger">Setlist not found.</p>;

  function addItem() {
    setItems((prev) => [...prev, { songId: "", notes: "" }]);
  }
  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveItem(i: number, dir: "up" | "down") {
    setItems((prev) => {
      const next = [...prev];
      const swap = dir === "up" ? i - 1 : i + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[i], next[swap]] = [next[swap], next[i]];
      return next;
    });
  }
  // P6-T3: HTML5 D&D reorder. Up/down buttons are kept for keyboard a11y.
  function reorderItem(from: number, to: number) {
    setItems((prev) => {
      if (from === to || from < 0 || from >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleSaveMeta() {
    setError("");
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    setSavingMeta(true);
    try {
      await updateMeta({
        id: id as Id<"setlists">,
        name,
        purpose: purpose || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleSaveItems() {
    setError("");
    const valid = items.filter((it) => it.songId);
    if (valid.length !== items.length) {
      setError("Pick a song for every row (or remove the empty ones)");
      return;
    }
    setSavingItems(true);
    try {
      await setItemsMutation({
        id: id as Id<"setlists">,
        items: valid.map((it, i) => ({
          order: i,
          songId: it.songId as Id<"songs">,
          notes: it.notes || undefined,
        })),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingItems(false);
    }
  }

  async function handleDelete() {
    await remove({ id: id as Id<"setlists"> });
    router.push("/music/setlists");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Setlist
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-bg-card border border-border-crm rounded p-2 text-base font-semibold"
        />
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Purpose (optional)"
          className="w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
        />
        <button
          onClick={handleSaveMeta}
          disabled={savingMeta}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
        >
          {savingMeta ? "Saving…" : "Save name + purpose"}
        </button>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wide text-text-muted">
            Items ({items.length})
          </h2>
          <button
            onClick={addItem}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
          >
            + Add item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
            <p className="text-text-body">
              No items yet. Click &ldquo;+ Add item&rdquo; to start.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(i));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverIndex !== i) setDragOverIndex(i);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === i) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverIndex(null);
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (Number.isFinite(from) && from !== i)
                    reorderItem(from, i);
                }}
                onDragEnd={() => setDragOverIndex(null)}
                className={`bg-bg-surface border rounded p-2 flex items-center gap-2 ${
                  dragOverIndex === i
                    ? "border-accent outline outline-2 outline-accent"
                    : "border-border-crm"
                }`}
              >
                <span
                  className="drag-grip-touch-hidden text-text-muted cursor-grab active:cursor-grabbing select-none px-1"
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
                <span className="text-xs font-mono text-text-muted w-8">
                  #{i + 1}
                </span>
                <select
                  value={it.songId}
                  onChange={(e) =>
                    updateItem(i, {
                      songId: e.target.value as Id<"songs">,
                    })
                  }
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                >
                  <option value="">— Pick a song —</option>
                  {(songs ?? []).map((s: SongOption) => (
                    <option key={s._id} value={s._id}>
                      {s.title}
                      {s.artist ? ` — ${s.artist}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  value={it.notes}
                  onChange={(e) => updateItem(i, { notes: e.target.value })}
                  placeholder="Notes"
                  className="w-40 bg-bg-card border border-border-crm rounded p-2 text-xs"
                />
                <button
                  onClick={() => moveItem(i, "up")}
                  disabled={i === 0}
                  className="px-3 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-border-crm rounded disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveItem(i, "down")}
                  disabled={i === items.length - 1}
                  className="px-3 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-border-crm rounded disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeItem(i)}
                  className="px-3 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs text-danger border border-border-crm rounded"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger mt-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSaveItems}
            disabled={savingItems}
            className="bg-accent text-bg-base px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            {savingItems ? "Saving…" : "Save setlist"}
          </button>
          {savedFlash && (
            <span className="text-sm text-success">✓ Saved</span>
          )}
        </div>
      </section>

      <section className="border-t border-border-crm pt-4">
        {confirmingDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-text-body">
              Delete this setlist permanently? This can&rsquo;t be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="bg-danger text-bg-base px-3 py-1.5 rounded text-sm font-semibold"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-1.5 rounded text-sm border border-border-crm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-text-muted hover:text-danger"
          >
            Delete setlist
          </button>
        )}
      </section>
    </div>
  );
}
