"use client";

import { Suspense, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";

type EventType =
  | "Wedding"
  | "Corporate"
  | "Festival"
  | "PrivateParty"
  | "Other"
  | "MainShow"
  | "PopUp"
  | "ContentShoot"
  | "Meeting"
  | "Rehearsal"
  | "Social";

type EventFamily = "ExternalBooking" | "InternalShow" | "TeamDiary";

const TYPES_BY_FAMILY: Record<EventFamily, ReadonlyArray<EventType>> = {
  ExternalBooking: ["Wedding", "Corporate", "Festival", "PrivateParty", "Other"],
  InternalShow: ["MainShow", "PopUp"],
  TeamDiary: ["Meeting", "Rehearsal", "Social", "ContentShoot"],
};

const INITIAL_STATUS: Record<EventFamily, string> = {
  ExternalBooking: "Inquiry",
  InternalShow: "Planning",
  TeamDiary: "Scheduled",
};

const VALID_FAMILIES: ReadonlyArray<EventFamily> = [
  "ExternalBooking",
  "InternalShow",
  "TeamDiary",
];

function isEventFamily(value: string | null): value is EventFamily {
  return value !== null && (VALID_FAMILIES as readonly string[]).includes(value);
}

export default function NewEventPage() {
  // useSearchParams() needs a Suspense boundary in Next.js 16 to avoid
  // bailing the whole route out of static rendering.
  return (
    <Suspense fallback={<div className="text-text-muted">Loading…</div>}>
      <NewEventForm />
    </Suspense>
  );
}

function NewEventForm() {
  const router = useRouter();
  const params = useSearchParams();
  const familyParam = params.get("family");
  const initialFamily: EventFamily = isEventFamily(familyParam)
    ? familyParam
    : "ExternalBooking";

  const create = useMutation(api.events.create);
  const [family, setFamily] = useState<EventFamily>(initialFamily);
  const typeOptions = TYPES_BY_FAMILY[family];
  const [form, setForm] = useState({
    name: "",
    type: typeOptions[0] as EventType,
    startDate: "",
    venue: "",
    clientName: "",
    clientEmail: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep `type` consistent when family changes (e.g. via URL navigation).
  // Reset to the first option in the new family's list if the current type
  // isn't valid for the new family.
  useEffect(() => {
    setForm((prev) =>
      (TYPES_BY_FAMILY[family] as ReadonlyArray<EventType>).includes(prev.type)
        ? prev
        : { ...prev, type: TYPES_BY_FAMILY[family][0] },
    );
  }, [family]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const id = await create({
        name: form.name,
        type: form.type,
        family,
        status: INITIAL_STATUS[family],
        startDate: new Date(form.startDate).getTime(),
        isAllDay: true,
        venue: form.venue ? { name: form.venue } : undefined,
        // `client` only applies to External Bookings — internal shows + team
        // diary entries don't have a paying client.
        client:
          family === "ExternalBooking" && form.clientEmail
            ? { name: form.clientName, email: form.clientEmail }
            : undefined,
      });
      router.push(`/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
      setSubmitting(false);
    }
  }

  const isExternal = family === "ExternalBooking";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-text-primary mb-4">New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          required
        />
        <TypedSelect<EventFamily>
          label="Family"
          value={family}
          onChange={(v) => setFamily(v)}
          options={VALID_FAMILIES}
        />
        <TypedSelect<EventType>
          label="Type"
          value={form.type}
          onChange={(v) => setForm({ ...form, type: v })}
          options={typeOptions}
        />
        <Input
          type="date"
          label="Event date"
          value={form.startDate}
          onChange={(v) => setForm({ ...form, startDate: v })}
          required
        />
        <Input
          label="Venue (optional)"
          value={form.venue}
          onChange={(v) => setForm({ ...form, venue: v })}
        />
        {isExternal && (
          <>
            <Input
              label="Client name"
              value={form.clientName}
              onChange={(v) => setForm({ ...form, clientName: v })}
            />
            <Input
              label="Client email"
              value={form.clientEmail}
              onChange={(v) => setForm({ ...form, clientEmail: v })}
            />
          </>
        )}
        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-bg-base px-4 py-2 rounded font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-text-body"
      />
    </label>
  );
}

// Generic Select wrapper so callers don't need `as any` casts. The option
// values are constrained to the same string-literal union as `value`, and
// the onChange handler receives a properly-typed value.
function TypedSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<T>;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-text-body"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
