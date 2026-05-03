"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Live-updating view of the event for the client. Visibility-gated: a section
// only appears once the corresponding "shared/sent" timestamp is set on the
// event by an admin. For Phase 1b-B2 only the contract section is wired —
// invoices / setlist / pre-event survey / shared notes ship in later tasks.
export function ClientPortalView({ eventId }: { eventId: Id<"events"> }) {
  const event = useQuery(api.events.getById, { id: eventId });

  if (event === undefined) {
    return <p className="text-sm text-[#8A8A8A]">Loading…</p>;
  }
  if (!event) {
    return <h1 className="text-2xl font-bold">Booking not found.</h1>;
  }

  const dateStr = new Date(event.startDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const greeting = event.client?.name
    ? `Hi ${event.client.name.split(" ")[0]}`
    : "Hi";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-1">
          {greeting} — your LME booking
        </h1>
        <p className="text-[#C4C4C4]">
          {dateStr}
          {event.venue?.name ? ` · ${event.venue.name}` : ""}
        </p>
      </section>

      {event.contract?.sentAt && (
        <Section title="Your contract">
          {event.contract.signedAt ? (
            <p>
              Signed by {event.contract.signedByName} on{" "}
              {new Date(event.contract.signedAt).toLocaleDateString("en-GB")}.
            </p>
          ) : (
            <p>Contract is ready for review and signature.</p>
          )}
          {/* Sign button lands in B6/B7. */}
        </Section>
      )}

      {/*
        Future Phase 1b sections (placeholders — wired in later tasks):
        - Invoices: gated on `event.finance?.deposit?.sentAt` /
          `event.finance?.balance?.sentAt` (added in B10 / Xero work).
        - Setlist: gated on `event.setlist?.sharedAt` (Phase 4).
        - Pre-event survey: gated on `event.preEventSurveyRequestedAt` (B8).
        - Notes shared with you: filtered by `sharedWithClient: true` flag
          on a future `sharedNotes` mechanism.
      */}

      <p className="text-xs text-[#8A8A8A] mt-12 text-center">
        Questions? Email{" "}
        <a href="mailto:admin@lmeband.com" className="underline">
          admin@lmeband.com
        </a>
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#111111] border border-[#252525] rounded p-5">
      <h2 className="text-xs uppercase tracking-wider text-[#5EEAD4] mb-3">
        {title}
      </h2>
      <div className="text-[#F5F5F0] space-y-2">{children}</div>
    </section>
  );
}
