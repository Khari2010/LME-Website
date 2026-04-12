"use client";

import { useEffect, useState, use } from "react";
import BookingForm from "@/components/BookingForm";
import type { BookingFormData } from "@/lib/booking-types";

export default function EditBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [initialData, setInitialData] = useState<BookingFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/booking/${token}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load booking");

        const result = await res.json();
        setInitialData(result.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [token]);

  async function handleSubmit(
    data: BookingFormData
  ): Promise<{ token?: string }> {
    const res = await fetch(`/api/booking/${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Update failed");
    return {};
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-teal-primary tracking-[0.2em] uppercase animate-pulse">
            Loading your booking...
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="font-display text-[3rem] text-lme-white tracking-[0.12em] mb-4">
            BOOKING NOT FOUND
          </h2>
          <p className="text-body text-base max-w-[400px] mx-auto leading-relaxed">
            This edit link may have expired or is invalid. If you need help,
            contact us at{" "}
            <a
              href="mailto:info@lmeband.com"
              className="text-teal-primary hover:text-teal-glow transition-colors"
            >
              info@lmeband.com
            </a>
          </p>
        </div>
      </div>
    );
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
            EDIT BOOKING
          </h1>
          <p className="font-mono text-[0.8rem] text-teal-primary tracking-[0.25em] uppercase mb-6">
            UPDATE YOUR DETAILS
          </p>
          <p className="text-[0.95rem] text-muted max-w-[540px] mx-auto leading-relaxed">
            Make changes to your booking details below. All fields are
            editable. Hit update when you&apos;re done.
          </p>
        </div>

        <BookingForm
          mode="edit"
          initialData={initialData || undefined}
          onSubmit={handleSubmit}
        />
      </div>

      <footer className="text-center py-12 font-mono text-[0.7rem] text-muted tracking-[0.1em]">
        &copy; 2026 LME &mdash; Live Music Enhancers | lmeband.com
      </footer>
    </div>
  );
}
