"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

// String form state for inputs; coerced/split on save.
type Row = {
  name: string;
  durationMins: string;
  setlistRef: string; // "" = none; otherwise an Id<"setlists">
  notes: string;
  cues: string; // comma-separated
};

export default function ShowRunTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setShowRun = useMutation(api.events.setShowRun);
  const setlists = useQuery(api.setlists.list, {});

  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  // Index of the row currently being hovered as a drop target — used to
  // highlight the target row visually during a drag.
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Hydrate form state when the event loads/changes. Keyed on _id so we don't
  // clobber in-progress edits on every Convex re-render.
  useEffect(() => {
    if (event?.showRun) {
      setRows(
        event.showRun.map((item) => ({
          name: item.name,
          durationMins: String(item.durationMins),
          setlistRef: item.setlistRef ?? "",
          notes: item.notes ?? "",
          cues: (item.cues ?? []).join(", "),
        })),
      );
    } else {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  // Defensive guard — the tab nav already gates this, but a user could land
  // here via direct URL on an event whose type doesn't support a show run.
  if (
    event.type !== "MainShow" &&
    event.type !== "PopUp" &&
    event.type !== "Festival"
  ) {
    return (
      <p className="text-sm text-text-muted">
        Show Run is only available for Main Show / Pop-Up / Festival events.
      </p>
    );
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { name: "", durationMins: "10", setlistRef: "", notes: "", cues: "" },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: "up" | "down") {
    setRows((prev) => {
      const newRows = [...prev];
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= newRows.length) return prev;
      [newRows[index], newRows[swapWith]] = [newRows[swapWith], newRows[index]];
      return newRows;
    });
  }

  // P6-T3: drag-and-drop reorder. Native HTML5 D&D — no library. Pulls the
  // source index out of the dragged item, reinserts at the drop target.
  // Up/down buttons are kept for keyboard accessibility.
  function reorderRow(from: number, to: number) {
    setRows((prev) => {
      if (from === to || from < 0 || from >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleSave() {
    setError("");
    let items;
    try {
      items = rows.map((r, i) => {
        const dur = Number(r.durationMins);
        if (!r.name.trim()) throw new Error(`Row ${i + 1} needs a name`);
        if (!Number.isFinite(dur) || dur <= 0) {
          throw new Error(`Row ${i + 1} needs a positive duration`);
        }
        const cues = r.cues
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return {
          order: i,
          name: r.name.trim(),
          durationMins: dur,
          setlistRef: r.setlistRef ? (r.setlistRef as Id<"setlists">) : undefined,
          notes: r.notes.trim() || undefined,
          cues: cues.length > 0 ? cues : undefined,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    setSaving(true);
    try {
      await setShowRun({ id: id as Id<"events">, items });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const totalMins = rows.reduce((sum, r) => {
    const d = Number(r.durationMins);
    return sum + (Number.isFinite(d) ? d : 0);
  }, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-text-muted">
            Show Run
          </h2>
          <p className="text-text-body text-sm mt-1">
            {rows.length} item{rows.length === 1 ? "" : "s"} · {totalMins} mins
            total
          </p>
        </div>
        <button
          onClick={addRow}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + Add row
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-6 text-center">
          <p className="text-text-body mb-2">No show run yet.</p>
          <p className="text-sm text-text-muted">
            Click &ldquo;+ Add row&rdquo; to start building the run-of-show.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
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
                if (Number.isFinite(from) && from !== i) reorderRow(from, i);
              }}
              onDragEnd={() => setDragOverIndex(null)}
              className={`bg-bg-surface border rounded p-3 space-y-2 ${
                dragOverIndex === i
                  ? "border-accent outline outline-2 outline-accent"
                  : "border-border-crm"
              }`}
            >
              <div className="flex items-center gap-2">
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
                <input
                  value={row.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="Section name (e.g. 'Vibezzy')"
                  className="flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <input
                  type="number"
                  value={row.durationMins}
                  onChange={(e) =>
                    updateRow(i, { durationMins: e.target.value })
                  }
                  placeholder="mins"
                  className="w-20 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <button
                  onClick={() => moveRow(i, "up")}
                  disabled={i === 0}
                  className="px-3 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-border-crm rounded disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveRow(i, "down")}
                  disabled={i === rows.length - 1}
                  className="px-3 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs border border-border-crm rounded disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeRow(i)}
                  className="px-3 py-1.5 text-sm sm:px-2 sm:py-1 sm:text-xs text-danger border border-border-crm rounded hover:bg-bg-card"
                  aria-label="Remove row"
                >
                  ✕
                </button>
              </div>
              <select
                value={row.setlistRef}
                onChange={(e) => updateRow(i, { setlistRef: e.target.value })}
                className="w-full bg-bg-card border border-border-crm rounded p-2 text-xs"
              >
                <option value="">— No setlist —</option>
                {(setlists ?? []).map((s: { _id: string; name: string }) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <textarea
                value={row.notes}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full bg-bg-card border border-border-crm rounded p-2 text-sm min-h-[40px]"
              />
              <input
                value={row.cues}
                onChange={(e) => updateRow(i, { cues: e.target.value })}
                placeholder="Cues (comma-separated, e.g. 'lighting: warm wash, smoke at 0:30')"
                className="w-full bg-bg-card border border-border-crm rounded p-2 text-xs font-mono"
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-bg-base px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save show run"}
        </button>
        {savedFlash && <span className="text-sm text-success">✓ Saved</span>}
      </div>
    </div>
  );
}
