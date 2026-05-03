"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Client form rendered after the magic-link token is verified server-side.
// Submits to `bookingForm.submitFullForm`, which re-verifies the token,
// writes `event.bookingConfig` + appends notes, and advances status to
// `FormReturned`.
//
// `eventId` is currently unused in the render (we don't show event details
// here — the form is the primary action), but we accept it so future
// iterations can pre-fill or display context without changing the page
// component's contract.

type BandConfig = "2-piece" | "4-piece" | "5-piece" | "Custom";
type EquipmentSource = "LME" | "Venue" | "Mixed";

export function BookingFormClient({
  eventId: _eventId,
  token,
}: {
  eventId: Id<"events">;
  token: string;
}) {
  const submit = useMutation(api.bookingForm.submitFullForm);
  const [form, setForm] = useState({
    bandConfig: "5-piece" as BandConfig,
    djRequired: false,
    equipmentSource: "LME" as EquipmentSource,
    needsStaging: false,
    stagingDetails: "",
    expectedGuests: "",
    notes: "",
  });
  const [state, setState] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle");
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setError("");
    try {
      // Combine boolean extras into a flat array for storage. Staging
      // details are folded into the same string so the admin sees them
      // alongside the "Staging" tag without a separate field on the event.
      const extras: string[] = [];
      if (form.djRequired) extras.push("DJ");
      if (form.needsStaging) {
        extras.push(
          form.stagingDetails
            ? `Staging: ${form.stagingDetails}`
            : "Staging",
        );
      }
      const expectedGuestsNum = Number.parseInt(form.expectedGuests, 10);
      await submit({
        token,
        bandConfig: form.bandConfig,
        djRequired: form.djRequired,
        equipmentSource: form.equipmentSource,
        extras,
        expectedGuests: Number.isFinite(expectedGuestsNum)
          ? expectedGuestsNum
          : undefined,
        notes: form.notes || undefined,
      });
      setState("submitted");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (state === "submitted") {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Thanks — got it</h1>
        <p className="text-[#C4C4C4]">
          We&apos;ll be in touch within a couple of days to schedule a quick
          call. Keep an eye on your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">A few more details</h1>
        <p className="text-[#C4C4C4]">
          Help us put a tailored proposal together for you. Takes ~3 minutes.
        </p>
      </div>

      <Field label="Band configuration">
        {(["2-piece", "4-piece", "5-piece", "Custom"] as BandConfig[]).map(
          (opt) => (
            <RadioOption
              key={opt}
              name="bandConfig"
              value={opt}
              selected={form.bandConfig === opt}
              onChange={() => setForm({ ...form, bandConfig: opt })}
            />
          ),
        )}
      </Field>

      <Field label="Add a DJ?">
        <Checkbox
          checked={form.djRequired}
          onChange={(v) => setForm({ ...form, djRequired: v })}
        >
          Yes, include a DJ for additional sets
        </Checkbox>
      </Field>

      <Field label="Equipment">
        {(
          [
            ["LME", "We bring everything"],
            ["Venue", "Venue provides PA & lighting"],
            ["Mixed", "Mix of both"],
          ] as Array<[EquipmentSource, string]>
        ).map(([v, label]) => (
          <RadioOption
            key={v}
            name="equipmentSource"
            value={label}
            selected={form.equipmentSource === v}
            onChange={() => setForm({ ...form, equipmentSource: v })}
          />
        ))}
      </Field>

      <Field label="Staging">
        <Checkbox
          checked={form.needsStaging}
          onChange={(v) => setForm({ ...form, needsStaging: v })}
        >
          We&apos;ll need a staging setup
        </Checkbox>
        {form.needsStaging && (
          <input
            type="text"
            placeholder="Any specifics? (size, type, etc.)"
            value={form.stagingDetails}
            onChange={(e) =>
              setForm({ ...form, stagingDetails: e.target.value })
            }
            className="w-full mt-2 bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm"
          />
        )}
      </Field>

      <Field label="Expected guest count">
        <input
          type="number"
          value={form.expectedGuests}
          onChange={(e) =>
            setForm({ ...form, expectedGuests: e.target.value })
          }
          className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm"
        />
      </Field>

      <Field label="Anything else we should know?">
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm min-h-[100px]"
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-[#ff6b6b]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full bg-[#14B8A6] text-black px-4 py-3 rounded font-bold disabled:opacity-50"
      >
        {state === "submitting" ? "Sending…" : "Send to LME"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#8A8A8A] mb-2">
        {label}
      </label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RadioOption({
  name,
  value,
  selected,
  onChange,
}: {
  name: string;
  value: string;
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${
        selected
          ? "border-[#14B8A6] bg-[#0e2a25]"
          : "border-[#252525] hover:border-[#444]"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onChange}
        className="accent-[#14B8A6]"
      />
      <span className="text-sm">{value}</span>
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#14B8A6]"
      />
      <span className="text-sm text-[#C4C4C4]">{children}</span>
    </label>
  );
}
