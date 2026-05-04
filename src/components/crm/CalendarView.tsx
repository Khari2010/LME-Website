"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Narrow projection of the Convex event doc that CalendarView actually
// renders. Convex's `listForCalendar` returns the full `eventDocValidator`
// shape; this type is structurally compatible — extra fields on the query
// result are simply ignored. Includes `family` so filter chips can narrow
// without a re-query.
type EventFamily = "ExternalBooking" | "InternalShow" | "TeamDiary";
type CalendarEvent = {
  _id: Id<"events">;
  name: string;
  family: EventFamily;
  startDate: number;
};

const FAMILY_FILTERS: ReadonlyArray<{ label: string; value: EventFamily | null }> = [
  { label: "All", value: null },
  { label: "External Bookings", value: "ExternalBooking" },
  { label: "Internal Shows", value: "InternalShow" },
  { label: "Team Diary", value: "TeamDiary" },
];

export function CalendarView() {
  const [filter, setFilter] = useState<EventFamily | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);

  const events = useQuery(api.events.listForCalendar, {
    from: monthStart.getTime(),
    to: monthEnd.getTime(),
  }) as CalendarEvent[] | undefined;

  const filtered = (events ?? []).filter((e) => !filter || e.family === filter);

  // Build the day grid for the visible month. Mutating `cursor` in place is
  // intentional and standard JS — we copy it into the array each iteration so
  // each entry is its own Date instance.
  const days: Date[] = [];
  const cursor = new Date(monthStart);
  while (cursor < monthEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of filtered) {
    const key = new Date(e.startDate).toDateString();
    const bucket = eventsByDay.get(key);
    if (bucket) {
      bucket.push(e);
    } else {
      eventsByDay.set(key, [e]);
    }
  }

  // JS `getDay()` returns 0=Sun..6=Sat. We want a Mon-first week (UK
  // convention), so shift Sunday from 0 to the end: `(getDay() + 6) % 7`
  // yields 0=Mon..6=Sun, which is the number of leading blank cells.
  const leadingBlanks = (monthStart.getDay() + 6) % 7;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="px-3 py-1 border border-border-crm rounded hover:bg-bg-card"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={() => setMonthOffset(0)}
            className="px-3 py-1 border border-border-crm rounded hover:bg-bg-card text-sm"
          >
            Today
          </button>
          <button
            onClick={() => setMonthOffset(monthOffset + 1)}
            className="px-3 py-1 border border-border-crm rounded hover:bg-bg-card"
            aria-label="Next month"
          >
            →
          </button>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          {monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-1 flex-wrap">
          {FAMILY_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-2 py-1 rounded border ${
                filter === f.value
                  ? "border-accent text-accent"
                  : "border-border-crm text-text-muted hover:text-text-body"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-xs text-text-muted text-center py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const key = d.toDateString();
          const today = key === new Date().toDateString();
          return (
            <div
              key={key}
              className={`bg-bg-surface border ${
                today ? "border-accent" : "border-border-crm"
              } rounded p-1.5 min-h-[80px]`}
            >
              <div className="text-xs text-text-muted">{d.getDate()}</div>
              <div className="space-y-0.5 mt-1">
                {(eventsByDay.get(key) ?? []).map((e) => (
                  <Link
                    key={e._id}
                    href={`/events/${e._id}`}
                    className="block text-xs px-1 py-0.5 rounded bg-bg-card hover:bg-accent hover:text-bg-base truncate"
                    title={e.name}
                  >
                    {e.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
