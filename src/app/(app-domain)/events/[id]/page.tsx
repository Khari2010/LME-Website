"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const STATUS_OPTIONS = [
  "Inquiry",
  "InitialReview",
  "Quoting",
  "ContractSent",
  "ContractSigned",
  "Booked",
  "EventDay",
  "Completed",
  "Cancelled",
  "Lost",
] as const;

export default function OverviewTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const updateEvent = useMutation(api.events.update);
  const setStatus = useMutation(api.events.setStatus);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (event === undefined || event === null) return;
    // Only sync server → local when there are no unsaved local edits.
    // Prevents the textarea from snapping back mid-typing if a remote update arrives.
    if (saved) {
      setNotes(event.notes ?? "");
    }
  }, [event?._id, event?.notes, saved]);

  if (event === undefined) return null;
  if (!event) return null;

  async function saveNotes() {
    await updateEvent({ id: id as Id<"events">, patch: { notes } });
    setSaved(true);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Description</h2>
          <p className="text-text-body whitespace-pre-wrap">{event.description ?? "—"}</p>
        </section>
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
            onBlur={saveNotes}
            className="w-full min-h-[160px] bg-bg-surface border border-border-crm rounded p-3 text-text-body"
            placeholder="Free-form notes about this booking…"
          />
          <p className="text-xs text-text-muted mt-1">{saved ? "Saved." : "Saving on blur…"}</p>
        </section>
      </div>
      <aside className="space-y-4">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Next action</h2>
          <p className="text-text-body">{event.nextActionLabel ?? "—"}</p>
        </section>
        <section>
          <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Status</h2>
          <select
            value={event.status}
            onChange={(e) => setStatus({ id: id as Id<"events">, status: e.target.value })}
            className="w-full bg-bg-surface border border-border-crm rounded p-2 text-text-body"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </section>
      </aside>
    </div>
  );
}
