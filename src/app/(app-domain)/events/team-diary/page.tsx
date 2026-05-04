"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";

// P4-T6: Team Diary list view. These events are short-cycle (a meeting next
// Sunday, a rehearsal the week after) so a kanban is overkill — a flat
// Upcoming / Past split is what the band actually needs to scan.

type TeamDiaryEvent = {
  _id: string;
  name: string;
  type: string;
  startDate: number;
  meetingDetails?: { attendees?: string[] };
};

export default function TeamDiaryPage() {
  const events = useQuery(api.events.listByFamily, { family: "TeamDiary" });

  if (events === undefined) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const now = Date.now();
  const typed = events as unknown as TeamDiaryEvent[];
  const upcoming = typed
    .filter((e) => e.startDate >= now)
    .sort((a, b) => a.startDate - b.startDate);
  const past = typed
    .filter((e) => e.startDate < now)
    .sort((a, b) => b.startDate - a.startDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Team Diary</h1>
        <Link
          href="/events/new?family=TeamDiary"
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + New
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-8 text-center">
          <p className="text-text-body mb-2">No team diary entries yet.</p>
          <p className="text-sm text-text-muted">
            Track meetings, rehearsals, content shoots, and team socials here.
          </p>
        </div>
      ) : (
        <>
          <Section title="Upcoming" events={upcoming} />
          <Section title="Past" events={past} />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  events,
}: {
  title: string;
  events: TeamDiaryEvent[];
}) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-text-muted mb-2">
        {title}
      </h2>
      <div className="bg-bg-surface border border-border-crm rounded divide-y divide-border-crm">
        {events.map((e) => (
          <Link
            key={e._id}
            href={`/events/${e._id}`}
            className="flex items-center justify-between p-3 hover:bg-bg-card"
          >
            <div>
              <div className="text-sm font-semibold text-text-primary">
                {e.name}
              </div>
              <div className="text-xs text-text-muted">
                {e.type} ·{" "}
                {new Date(e.startDate).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="text-xs text-text-muted">
              {e.meetingDetails?.attendees?.length
                ? `${e.meetingDetails.attendees.length} attendee(s)`
                : ""}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
