"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { roleLabel, type Role } from "@/lib/role-permissions";

type DashboardRole = Role | "no-access";

export function DashboardClient({ role }: { role: string }) {
  const r = role as DashboardRole;
  const externalBookings = useQuery(api.events.listByFamily, { family: "ExternalBooking" });

  if (r === "no-access") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <div className="bg-bg-surface border border-border-crm rounded p-4">
          <p className="text-text-body">
            Your account is being set up. If this persists, contact an admin.
          </p>
        </div>
      </div>
    );
  }

  const isDirector = r === "director" || r === "owner";
  const isAdminLike = r === "admin" || r === "drafter" || isDirector;
  const isInternalEvents = r === "internal-events";
  const isMarketing = r === "marketing";
  const isProduction = r === "production";
  const isTicketing = r === "ticketing";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="text-sm text-text-muted">Role: {roleLabel(r)}</p>

      {/* Bookings pipeline — director / admin / owner */}
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
          <Link
            href="/events/external-bookings"
            className="text-sm text-accent mt-2 inline-block"
          >
            View pipeline →
          </Link>
        </section>
      )}

      {/* Director / admin extras: cashflow + marketing stubs */}
      {isAdminLike && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Cashflow</h2>
            <p className="text-sm text-text-muted">Coming soon — Finance widgets land in T2/T3.</p>
          </section>
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Internal Shows</h2>
            <p className="text-sm text-text-muted">Upcoming counts arrive with T3 analytics.</p>
          </section>
        </div>
      )}

      {/* Internal Events — show count + marketing stub */}
      {isInternalEvents && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Internal Shows</h2>
            <p className="text-sm text-text-muted">
              Plan upcoming gigs in <Link href="/events/internal-shows" className="text-accent hover:underline">Internal Shows</Link>.
            </p>
          </section>
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Marketing</h2>
            <p className="text-sm text-text-muted">Campaign metrics arrive in T3.</p>
          </section>
        </div>
      )}

      {/* Marketing role — campaigns + subscribers + planner */}
      {isMarketing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Campaigns</h2>
            <p className="text-sm text-text-muted">Active + scheduled campaigns (coming soon).</p>
          </section>
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Subscribers</h2>
            <p className="text-sm text-text-muted">Mailing list count (coming soon).</p>
          </section>
          <section className="bg-bg-surface border border-border-crm rounded p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Content planner</h2>
            <p className="text-sm text-text-muted">
              Open the <span className="text-text-body">planner</span> to schedule posts (coming soon).
            </p>
          </section>
        </div>
      )}

      {/* Production role — crew assignments */}
      {isProduction && (
        <section className="bg-bg-surface border border-border-crm rounded p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-2">My production crew</h2>
          <p className="text-sm text-text-muted">
            Internal Shows where you're assigned to the production crew (coming soon).
          </p>
        </section>
      )}

      {/* Ticketing role — ticket sales summary */}
      {isTicketing && (
        <section className="bg-bg-surface border border-border-crm rounded p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Ticket sales</h2>
          <p className="text-sm text-text-muted">
            Aggregate tickets sold across upcoming Internal Shows (coming soon).
          </p>
        </section>
      )}
    </div>
  );
}
