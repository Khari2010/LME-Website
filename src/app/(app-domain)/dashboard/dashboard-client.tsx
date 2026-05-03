"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";

export function DashboardClient({ role }: { role: string }) {
  const externalBookings = useQuery(api.events.listByFamily, { family: "ExternalBooking" });

  const isDirector = role === "director" || role === "owner";
  const isAdminLike = role === "admin" || isDirector;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="text-sm text-text-muted">Role: {role}</p>

      {isAdminLike && (
        <section className="bg-bg-surface border border-border-crm rounded p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Bookings pipeline</h2>
          {externalBookings === undefined ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {externalBookings.map((e) => (
                <li key={e._id} className="text-sm">
                  <Link href={`/events/${e._id}`} className="hover:underline text-accent">
                    {e.name} — {e.status}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/events/external-bookings" className="text-sm text-accent mt-2 inline-block">
            View pipeline →
          </Link>
        </section>
      )}
    </div>
  );
}
