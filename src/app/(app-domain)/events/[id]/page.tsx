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
        {event.family === "ExternalBooking" && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Send to client</h2>
            <SendFormButton id={id as Id<"events">} disabled={!event.client?.email} />
            {!event.client?.email && (
              <p className="text-xs text-danger mt-1">Client email required.</p>
            )}
          </section>
        )}
        {event.family === "ExternalBooking" && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Contract</h2>
            <SendContractButton
              id={id as Id<"events">}
              disabled={!event.client?.email || !event.finance?.fee}
            />
            {!event.finance?.fee && (
              <p className="text-xs text-danger mt-1">
                Set a fee on Finance &amp; Legal tab first.
              </p>
            )}
          </section>
        )}
        {event.family === "ExternalBooking" && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Pre-event survey</h2>
            <SendSurveyButton
              id={id as Id<"events">}
              disabled={
                !event.client?.email ||
                (event.status !== "Booked" && event.status !== "PreEvent")
              }
            />
            {event.status !== "Booked" && event.status !== "PreEvent" && (
              <p className="text-xs text-text-muted mt-1">
                Available after deposit is paid (status: Booked).
              </p>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}

// Mints a fresh booking-form token + emails the client a magic-link.
// Lives in this file because it's only used here and needs `useMutation`,
// which is client-only.
function SendFormButton({ id, disabled }: { id: Id<"events">; disabled: boolean }) {
  const send = useMutation(api.bookingForm.sendFullForm);
  const [state, setState] = useState<{
    status: "idle" | "sending" | "sent" | "error";
    portalUrl?: string;
    error?: string;
  }>({ status: "idle" });

  async function handleClick() {
    setState({ status: "sending" });
    try {
      const result = await send({ id });
      setState({ status: "sent", portalUrl: result.portalUrl });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={disabled || state.status === "sending"}
        className="w-full bg-accent text-bg-base px-3 py-2 rounded text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.status === "sending"
          ? "Sending…"
          : state.status === "sent"
            ? "Sent ✓"
            : "Send full booking form"}
      </button>
      {state.status === "sent" && state.portalUrl && (
        <p className="text-xs text-text-muted break-all">Link: {state.portalUrl}</p>
      )}
      {state.status === "error" && state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

// Sends the pre-event survey magic-link via `preEventSurvey.sendSurvey`.
// Disabled unless the event is at status `Booked` or `PreEvent` (deposit
// paid) AND has a client email — the mutation rejects otherwise.
function SendSurveyButton({
  id,
  disabled,
}: {
  id: Id<"events">;
  disabled: boolean;
}) {
  const send = useMutation(api.preEventSurvey.sendSurvey);
  const [state, setState] = useState<{
    status: "idle" | "sending" | "sent" | "error";
    portalUrl?: string;
    error?: string;
  }>({ status: "idle" });

  async function handleClick() {
    setState({ status: "sending" });
    try {
      const result = await send({ id });
      setState({ status: "sent", portalUrl: result.portalUrl });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={disabled || state.status === "sending"}
        className="w-full bg-accent text-bg-base px-3 py-2 rounded text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.status === "sending"
          ? "Sending…"
          : state.status === "sent"
            ? "Sent ✓"
            : "Send pre-event survey"}
      </button>
      {state.status === "sent" && state.portalUrl && (
        <p className="text-xs text-text-muted break-all">
          Link: {state.portalUrl}
        </p>
      )}
      {state.status === "error" && state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

// Generates + sends the LME standard contract via `contracts.sendContract`.
// Disabled until the event has both a client email AND a fee set, since the
// mutation rejects otherwise.
function SendContractButton({
  id,
  disabled,
}: {
  id: Id<"events">;
  disabled: boolean;
}) {
  const send = useMutation(api.contracts.sendContract);
  const [state, setState] = useState<{
    status: "idle" | "sending" | "sent" | "error";
    portalUrl?: string;
    error?: string;
  }>({ status: "idle" });

  async function handleClick() {
    setState({ status: "sending" });
    try {
      const result = await send({ id });
      setState({ status: "sent", portalUrl: result.portalUrl });
    } catch (err) {
      setState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={disabled || state.status === "sending"}
        className="w-full bg-accent text-bg-base px-3 py-2 rounded text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.status === "sending"
          ? "Sending…"
          : state.status === "sent"
            ? "Sent ✓"
            : "Send contract"}
      </button>
      {state.status === "sent" && state.portalUrl && (
        <p className="text-xs text-text-muted break-all">
          Link: {state.portalUrl}
        </p>
      )}
      {state.status === "error" && state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
