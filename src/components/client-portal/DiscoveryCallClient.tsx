"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

// Discovery call slot picker rendered after the magic-link is verified
// server-side. Submits to `discoveryCall.pickSlot`, which re-verifies the
// token and writes back to `event.discoveryCall.pickedSlot`. Mirrors the
// state machine of `ContractSignClient.tsx`: idle → picking → confirmed.

export function DiscoveryCallClient({
  token,
  eventName,
  clientName,
  proposedSlots,
  pickedSlot,
  cancelled,
}: {
  token: string;
  eventName: string;
  clientName: string;
  proposedSlots: number[];
  pickedSlot: number | null;
  cancelled: boolean;
}) {
  const pick = useMutation(api.discoveryCall.pickSlot);
  const [picking, setPicking] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<number | null>(pickedSlot);

  if (cancelled) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Discovery call cancelled</h1>
        <p className="text-[#C4C4C4]">
          Please contact{" "}
          <a href="mailto:admin@lmeband.com" className="underline">
            admin@lmeband.com
          </a>{" "}
          to reschedule.
        </p>
      </div>
    );
  }

  if (confirmed) {
    const dt = new Date(confirmed);
    const friendly = dt.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Booked ✓</h1>
        <p className="text-[#C4C4C4]">
          Thanks {clientName.split(" ")[0] || "there"}! See you on{" "}
          <strong className="text-[#5EEAD4]">{friendly}</strong>. We&apos;ll
          send a calendar invite + dial-in details shortly.
        </p>
      </div>
    );
  }

  async function handlePick(slot: number) {
    setPicking(slot);
    setError("");
    try {
      await pick({ token, slot });
      setConfirmed(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPicking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Pick a time</h1>
        <p className="text-[#C4C4C4]">
          {eventName} · 15-minute call with the LME team
        </p>
      </div>

      <div className="space-y-2">
        {proposedSlots.map((slot) => {
          const dt = new Date(slot);
          const dateStr = dt.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          const timeStr = dt.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const isPicking = picking === slot;
          return (
            <button
              key={slot}
              onClick={() => handlePick(slot)}
              disabled={picking !== null}
              className="w-full text-left p-4 border border-[#252525] rounded hover:border-[#14B8A6] hover:bg-[#0e2a25] disabled:opacity-50 transition"
            >
              <div className="font-semibold">{dateStr}</div>
              <div className="text-sm text-[#C4C4C4]">{timeStr}</div>
              {isPicking && (
                <div className="text-xs text-[#5EEAD4] mt-1">Booking…</div>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#ff6b6b]">
          {error}
        </p>
      )}

      <p className="text-xs text-[#8A8A8A]">
        None of these work? Email{" "}
        <a href="mailto:admin@lmeband.com" className="underline">
          admin@lmeband.com
        </a>{" "}
        and we&apos;ll find another time.
      </p>
    </div>
  );
}
