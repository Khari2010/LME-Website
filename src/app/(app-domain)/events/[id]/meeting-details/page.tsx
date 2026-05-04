"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

// P4-T7: Meeting Details editor for Team Diary events. Surfaces four
// editable sections — attendees (free-text array), transcript (textarea),
// decisions (string array, one per line), and actions (description +
// assignee + done flag). Save calls `setMeetingDetails` which patches the
// whole sub-block in one shot.

type ActionRow = { description: string; assignee: string; done: boolean };

export default function MeetingDetailsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const setDetails = useMutation(api.meetingDetails.setMeetingDetails);
  const extract = useMutation(
    api.transcriptExtraction.extractFromTranscript,
  );

  const [attendeesText, setAttendeesText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [decisionsText, setDecisionsText] = useState("");
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState("");

  // Hydrate local form state when the event loads (or switches). Using
  // event._id as the dep keeps us from re-hydrating mid-edit when the
  // mutation echoes back.
  useEffect(() => {
    if (event?.meetingDetails) {
      const md = event.meetingDetails;
      setAttendeesText(md.attendees.join(", "));
      setTranscript(md.transcript ?? "");
      setDecisionsText(md.decisions.join("\n"));
      setActions(
        md.actions.map(
          (a: {
            description: string;
            assignee?: string;
            done: boolean;
          }) => ({
            description: a.description,
            assignee: a.assignee ?? "",
            done: a.done,
          }),
        ),
      );
    } else {
      setAttendeesText("");
      setTranscript("");
      setDecisionsText("");
      setActions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;
  if (event.family !== "TeamDiary") {
    return (
      <p className="text-sm text-text-muted">
        Meeting details are only for Team Diary events.
      </p>
    );
  }

  function addAction() {
    setActions((prev) => [
      ...prev,
      { description: "", assignee: "", done: false },
    ]);
  }
  function updateAction(i: number, patch: Partial<ActionRow>) {
    setActions((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    );
  }
  function removeAction(i: number) {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const attendees = attendeesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const decisions = decisionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const validActions = actions
        .filter((a) => a.description.trim())
        .map((a) => ({
          description: a.description.trim(),
          assignee: a.assignee.trim() || undefined,
          done: a.done,
        }));
      await setDetails({
        id: id as Id<"events">,
        details: {
          attendees,
          transcript: transcript || undefined,
          decisions,
          actions: validActions,
        },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Attendees
        </h2>
        <input
          value={attendeesText}
          onChange={(e) => setAttendeesText(e.target.value)}
          placeholder="Chris, Justin, Reuben, Khari, Tanisha, Stacey"
          className="w-full bg-bg-card border border-border-crm rounded p-2 text-sm"
        />
        <p className="text-xs text-text-muted">Comma-separated names.</p>
      </section>

      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Transcript
        </h2>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the meeting transcript here…"
          className="w-full bg-bg-card border border-border-crm rounded p-2 text-sm font-mono min-h-[200px]"
        />
      </section>

      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Decisions
        </h2>
        <textarea
          value={decisionsText}
          onChange={(e) => setDecisionsText(e.target.value)}
          placeholder="One decision per line"
          className="w-full bg-bg-card border border-border-crm rounded p-2 text-sm min-h-[120px]"
        />
      </section>

      <section className="bg-bg-surface border border-border-crm rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide text-text-muted">
            Actions
          </h2>
          <button
            onClick={addAction}
            className="bg-accent text-bg-base px-3 py-1 rounded text-xs font-semibold"
          >
            + Add action
          </button>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-text-muted">No actions yet.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.done}
                  onChange={(e) => updateAction(i, { done: e.target.checked })}
                  className="accent-accent"
                />
                <input
                  value={a.description}
                  onChange={(e) =>
                    updateAction(i, { description: e.target.value })
                  }
                  placeholder="What needs doing?"
                  className={`flex-1 bg-bg-card border border-border-crm rounded p-2 text-sm ${
                    a.done ? "line-through text-text-muted" : ""
                  }`}
                />
                <input
                  value={a.assignee}
                  onChange={(e) =>
                    updateAction(i, { assignee: e.target.value })
                  }
                  placeholder="Assignee"
                  className="w-32 bg-bg-card border border-border-crm rounded p-2 text-sm"
                />
                <button
                  onClick={() => removeAction(i)}
                  className="px-2 py-1 text-xs text-danger border border-border-crm rounded"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-bg-base px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedFlash && (
          <span className="text-sm text-success">✓ Saved</span>
        )}
        {/* Auto-extract: scans the saved transcript for decisions + actions
            and appends them to this event. Disabled until a transcript has
            been saved (we read from event.meetingDetails, not local state,
            so users must Save first to apply edits). After extraction the
            page reloads to re-hydrate local form state — the useEffect that
            seeds the form is keyed on event._id only, so it won't otherwise
            pick up the patched meetingDetails. Crude but reliable for MVP. */}
        <button
          onClick={async () => {
            setExtractMessage("");
            setExtracting(true);
            try {
              const result = await extract({ id: id as Id<"events"> });
              setExtractMessage(
                `Added ${result.decisionsAdded} decision(s) + ${result.actionsAdded} action(s)`,
              );
              setTimeout(() => window.location.reload(), 1200);
            } catch (err) {
              setExtractMessage(
                err instanceof Error ? err.message : String(err),
              );
            } finally {
              setExtracting(false);
            }
          }}
          disabled={extracting || !event.meetingDetails?.transcript}
          title={
            !event.meetingDetails?.transcript
              ? "Save a transcript first"
              : "Scan transcript for decisions + actions"
          }
          className="bg-bg-card text-text-body border border-border-crm px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {extracting ? "Extracting…" : "Auto-extract"}
        </button>
        {extractMessage && (
          <span className="text-sm text-text-muted">{extractMessage}</span>
        )}
      </div>
    </div>
  );
}
