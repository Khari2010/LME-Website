"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import { Pipeline, type EventSummary } from "@/components/crm/Pipeline";

export default function ExternalBookingsPage() {
  const events = useQuery(api.events.listByFamily, { family: "ExternalBooking" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">External Bookings</h1>
        <Link
          href="/events/new?family=ExternalBooking"
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + New
        </Link>
      </div>
      {events === undefined ? (
        <p className="text-sm text-text-muted">Loading bookings…</p>
      ) : events.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-8 text-center">
          <p className="text-text-body mb-2">No bookings yet.</p>
          <p className="text-sm text-text-muted">
            New inquiries from <code>lmeband.com/bookingform</code> will appear here automatically.
          </p>
        </div>
      ) : (
        <Pipeline events={events as EventSummary[]} />
      )}
    </div>
  );
}
