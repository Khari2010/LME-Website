"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Client", href: "/client" },
  { label: "Finance & Legal", href: "/finance" },
  { label: "Setlist", href: "/setlist" },
];

export function EventDetailHeader({ id }: { id: Id<"events"> }) {
  const event = useQuery(api.events.getById, { id });
  const pathname = usePathname();
  const base = `/events/${id}`;

  if (event === undefined) return <p className="text-sm text-text-muted">Loading…</p>;
  if (!event) return <p className="text-sm text-danger">Event not found.</p>;

  const dateStr = new Date(event.startDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="border-b border-border-crm pb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-2xl font-bold text-text-primary">{event.name}</h1>
        <span className="text-xs px-2 py-1 bg-bg-card rounded text-text-body">{event.status}</span>
      </div>
      <p className="text-sm text-text-muted">
        {dateStr}
        {event.venue?.name && ` · ${event.venue.name}`}
      </p>
      <nav className="mt-4 flex gap-1 -mb-4">
        {TABS.map((t) => {
          const href = `${base}${t.href}`;
          const active = pathname === href || (t.href === "" && pathname === base);
          return (
            <Link
              key={t.label}
              href={href}
              className={`px-3 py-2 text-sm border-b-2 ${
                active
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-body"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
