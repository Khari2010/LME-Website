"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import { Pipeline } from "@/components/crm/Pipeline";

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
      ) : (
        <Pipeline events={events} />
      )}
    </div>
  );
}
