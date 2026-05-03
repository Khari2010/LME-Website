import Link from "next/link";
import type { EventSummary } from "./Pipeline";

export function EventCard({ event }: { event: EventSummary }) {
  const dateStr = new Date(event.startDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <Link
      href={`/events/${event._id}`}
      className="block bg-bg-surface border border-border-crm rounded p-3 hover:border-accent transition"
    >
      <div className="font-semibold text-text-primary text-sm mb-1">{event.name}</div>
      <div className="text-xs text-text-muted">{dateStr}</div>
      {event.venue?.name && (
        <div className="text-xs text-text-muted mt-1">📍 {event.venue.name}</div>
      )}
      {event.client?.name && (
        <div className="text-xs text-text-body mt-1">{event.client.name}</div>
      )}
    </Link>
  );
}
