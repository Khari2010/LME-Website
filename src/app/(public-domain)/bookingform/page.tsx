"use client";

import BookingForm from "@/components/BookingForm";
import type { BookingFormData } from "@/lib/booking-types";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type InquiryEventType =
  | "Wedding"
  | "Corporate"
  | "Festival"
  | "PrivateParty"
  | "Other";

function mapEventType(t: string): InquiryEventType {
  switch (t) {
    case "Wedding":
      return "Wedding";
    case "Corporate":
      return "Corporate";
    case "Festival":
      return "Festival";
    case "Private Party":
      return "PrivateParty";
    default:
      return "Other";
  }
}

export default function BookingFormPage() {
  const submit = useMutation(api.publicInquiry.submitInquiry);

  async function handleSubmit(
    data: BookingFormData
  ): Promise<{ token?: string }> {
    // Phase 1a: lightweight inquiry only. Many `BookingFormData` fields
    // (contactNumber, day-of contacts, soundcheckTime, genres, djRequired,
    // load-in details, special requests, venue contacts, parking/sound limiter
    // toggles, etc.) are intentionally dropped — Phase 1b reintroduces them
    // via the post-review full booking form.
    const expectedGuestsNum = data.expectedGuests
      ? Number.parseInt(data.expectedGuests, 10)
      : undefined;

    const result = await submit({
      clientName: data.clientName,
      clientEmail: data.email,
      clientPhone: data.contactNumber || undefined,
      eventType: mapEventType(data.eventType),
      eventDate: new Date(data.eventDate).getTime(),
      venue: data.venueName || undefined,
      venueAddress: data.venueAddress || undefined,
      expectedGuests:
        expectedGuestsNum !== undefined && Number.isFinite(expectedGuestsNum)
          ? expectedGuestsNum
          : undefined,
      description: data.specialRequests || undefined,
    });
    // TODO(phase-1b): Replace with an opaque token from the magic-link booking flow
    // (see docs/superpowers/plans/2026-04-12-magic-link-booking.md). Phase 1a returns
    // the Convex eventId to preserve the existing <BookingForm> contract.
    return { token: result.eventId };
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[680px] mx-auto px-6 pt-12 pb-16 flex-1">
        {/* Header */}
        <div className="text-center mb-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/lme-typo-white.png"
            alt="LME — Live Music Enhancers"
            className="h-12 mx-auto mb-6"
          />
          <h1 className="font-display text-[3.2rem] text-lme-white tracking-[0.12em] leading-none mb-2">
            BOOKING FORM
          </h1>
          <p className="font-mono text-[0.8rem] text-teal-primary tracking-[0.25em] uppercase mb-6">
            WE WANT TO PARTY.
          </p>
          <p className="text-[0.95rem] text-muted max-w-[540px] mx-auto leading-relaxed">
            Complete this form to help us prepare for your event. This is for
            information gathering only — it is not a binding contract. Once
            received, we&apos;ll send a Performance Contract for review and
            signature.
          </p>
        </div>

        <BookingForm mode="create" onSubmit={handleSubmit} />
      </div>

      <footer className="text-center py-12 font-mono text-[0.7rem] text-muted tracking-[0.1em]">
        &copy; 2026 LME &mdash; Live Music Enhancers | lmeband.com
      </footer>
    </div>
  );
}
