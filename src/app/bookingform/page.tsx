"use client";

import BookingForm from "@/components/BookingForm";
import type { BookingFormData } from "@/lib/booking-types";

export default function BookingFormPage() {
  async function handleSubmit(
    data: BookingFormData
  ): Promise<{ token?: string }> {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Submission failed");

    const result = await res.json();
    return { token: result.token };
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
