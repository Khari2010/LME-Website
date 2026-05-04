"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

// Pre-event survey form rendered after the magic-link is verified server-side.
// Submits to `preEventSurvey.submitSurvey`, which re-verifies the token and
// writes back to `event.preEventSurvey`. Same UI patterns as
// `BookingFormClient.tsx`, with one extra interaction: genres are a chip-set
// multi-select.
//
// Genre options match the LME public site / brand kit so the wording felt
// here lines up with what the client has already seen.

const GENRE_OPTIONS = [
  "Afrobeats",
  "RnB 2000s",
  "RnB 90s",
  "Soca",
  "Disco",
  "Funky House",
  "Pop",
  "Dancehall",
  "Gospel",
  "Amapiano",
  "Reggae",
];

export function PreEventSurveyClient({
  token,
  eventName,
  eventDate,
  venue,
  clientName,
  alreadySubmitted,
}: {
  token: string;
  eventName: string;
  eventDate: number;
  venue: string | null;
  clientName: string;
  alreadySubmitted: boolean;
}) {
  const submit = useMutation(api.preEventSurvey.submitSurvey);
  const [genres, setGenres] = useState<string[]>([]);
  const [mustPlays, setMustPlays] = useState("");
  const [doNotPlays, setDoNotPlays] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >(alreadySubmitted ? "submitted" : "idle");
  const [error, setError] = useState("");

  function toggleGenre(g: string) {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setError("");
    try {
      await submit({
        token,
        genrePreferences: genres,
        mustPlays: mustPlays
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        doNotPlays: doNotPlays
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        finalStartTime: startTime || undefined,
        finalEndTime: endTime || undefined,
        dayOfContactName: contactName || undefined,
        dayOfContactPhone: contactPhone || undefined,
        notes: notes || undefined,
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
        <h1 className="text-3xl font-bold">All set ✓</h1>
        <p className="text-[#C4C4C4]">
          Thanks {clientName.split(" ")[0]}! We&apos;ve got your details. The
          band will use these to put the night together perfectly.
        </p>
      </div>
    );
  }

  const dateStr = new Date(eventDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          Final details for your event
        </h1>
        <p className="text-[#C4C4C4]">
          {eventName} · {dateStr}
          {venue ? ` · ${venue}` : ""}
        </p>
      </div>

      <Field label="Genres you love (pick any)">
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGenre(g)}
              className={`px-3 py-1 rounded-full text-sm border ${
                genres.includes(g)
                  ? "bg-[#14B8A6] text-black border-[#14B8A6]"
                  : "border-[#252525] text-[#C4C4C4] hover:border-[#444]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Must-plays (one per line)">
        <textarea
          value={mustPlays}
          onChange={(e) => setMustPlays(e.target.value)}
          placeholder={"e.g. Beyoncé — Crazy in Love\nWizkid — Essence"}
          className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm min-h-[80px]"
        />
      </Field>

      <Field label="Do-not-plays (one per line)">
        <textarea
          value={doNotPlays}
          onChange={(e) => setDoNotPlays(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm min-h-[80px]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start time">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm"
          />
        </Field>
        <Field label="End time">
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Day-of contact (name)">
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm"
          />
        </Field>
        <Field label="Day-of contact (phone)">
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Anything else?">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#252525] rounded p-2 text-sm min-h-[80px]"
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
      <div>{children}</div>
    </div>
  );
}
