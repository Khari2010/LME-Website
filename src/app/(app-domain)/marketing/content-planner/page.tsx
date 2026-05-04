"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";

type Entry = {
  id: string;
  source: "campaign" | "engagement-post";
  date: number | null;
  status: "draft" | "scheduled" | "sent";
  title: string;
  subtitle?: string;
  href?: string;
};

export default function ContentPlannerPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);

  const entries = useQuery(api.contentPlanner.listEntries, {
    from: monthStart.getTime(),
    to: monthEnd.getTime(),
  });

  const days: Date[] = [];
  for (let d = new Date(monthStart); d < monthEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const byDay = new Map<string, Entry[]>();
  if (entries) {
    for (const e of entries) {
      if (e.date == null) continue;
      const key = new Date(e.date).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(e);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-mono">
            LME · Marketing
          </p>
          <h1
            className="text-4xl mt-1"
            style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
          >
            Content Planner
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Cross-source timeline of campaigns and per-engagement posts.
          </p>
        </div>
        <Link
          href="/marketing"
          className="text-sm text-accent hover:text-accent-hover"
        >
          ← Back to Marketing
        </Link>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="px-3 py-1.5 border border-border-crm rounded-md hover:bg-bg-card text-sm text-text-body"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className="px-3 py-1.5 border border-border-crm rounded-md hover:bg-bg-card text-sm text-text-body"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(monthOffset + 1)}
            className="px-3 py-1.5 border border-border-crm rounded-md hover:bg-bg-card text-sm text-text-body"
            aria-label="Next month"
          >
            →
          </button>
        </div>
        <h2
          className="text-2xl text-text-primary"
          style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
        >
          {monthStart.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="text-xs text-text-muted font-mono uppercase tracking-[0.18em]">
          {entries?.length ?? 0} item{entries?.length === 1 ? "" : "s"} this month
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-[0.18em] text-text-muted font-mono text-center py-1"
          >
            {d}
          </div>
        ))}
        {/* Lead-in blanks so day 1 lands on the correct weekday (Mon-first). */}
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const key = d.toDateString();
          const isToday = key === new Date().toDateString();
          const entriesForDay = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`bg-bg-base border ${
                isToday ? "border-accent/60" : "border-border-crm"
              } rounded-md p-1.5 min-h-[88px]`}
            >
              <div
                className={`text-xs ${
                  isToday ? "text-accent font-semibold" : "text-text-muted"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-1 mt-1">
                {entriesForDay.map((e) => (
                  <Link
                    key={e.id}
                    href={e.href ?? "#"}
                    className={`block text-[11px] px-1.5 py-0.5 rounded truncate transition-colors ${
                      e.status === "sent"
                        ? "bg-bg-card text-text-muted hover:bg-bg-card"
                        : e.status === "scheduled"
                          ? "bg-accent/15 text-accent-hover hover:bg-accent/25"
                          : "bg-bg-card text-text-body hover:bg-bg-card"
                    }`}
                    title={e.title}
                  >
                    {e.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-accent/15 border border-accent/40" />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-bg-card border border-border-crm" />
          Sent
        </span>
      </div>

      {/* Drafts list (no schedule) */}
      <DraftsSection />
    </div>
  );
}

function DraftsSection() {
  const drafts = useQuery(api.contentPlanner.listDrafts, {});
  if (!drafts || drafts.length === 0) return null;
  return (
    <section
      aria-labelledby="drafts-heading"
      className="border-t border-border-crm pt-6"
    >
      <h2
        id="drafts-heading"
        className="text-sm uppercase tracking-[0.2em] text-text-body font-mono mb-3"
      >
        Drafts (no schedule)
      </h2>
      <ul className="rounded-xl border border-border-crm bg-bg-surface divide-y divide-border-crm">
        {drafts.map((d) => (
          <li key={d._id}>
            <Link
              href={`/marketing/compose?id=${d._id}`}
              className="block px-4 py-3 text-sm text-text-body hover:text-accent hover:bg-bg-base transition-colors"
            >
              {d.subjectLine || "Untitled draft"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
