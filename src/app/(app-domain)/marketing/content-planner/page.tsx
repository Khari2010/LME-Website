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
          <p className="text-xs uppercase tracking-[0.2em] text-teal-400 font-mono">
            LME · Marketing
          </p>
          <h1
            className="text-4xl mt-1"
            style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
          >
            Content Planner
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Cross-source timeline of campaigns and per-engagement posts.
          </p>
        </div>
        <Link
          href="/marketing"
          className="text-sm text-teal-400 hover:text-teal-300"
        >
          ← Back to Marketing
        </Link>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="px-3 py-1.5 border border-[#252525] rounded-md hover:bg-[#1a1a1a] text-sm text-gray-300"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className="px-3 py-1.5 border border-[#252525] rounded-md hover:bg-[#1a1a1a] text-sm text-gray-300"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(monthOffset + 1)}
            className="px-3 py-1.5 border border-[#252525] rounded-md hover:bg-[#1a1a1a] text-sm text-gray-300"
            aria-label="Next month"
          >
            →
          </button>
        </div>
        <h2
          className="text-2xl text-white"
          style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
        >
          {monthStart.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="text-xs text-gray-500 font-mono uppercase tracking-[0.18em]">
          {entries?.length ?? 0} item{entries?.length === 1 ? "" : "s"} this month
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono text-center py-1"
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
              className={`bg-[#0c0c0c] border ${
                isToday ? "border-teal-500/60" : "border-[#1f1f1f]"
              } rounded-md p-1.5 min-h-[88px]`}
            >
              <div
                className={`text-xs ${
                  isToday ? "text-teal-400 font-semibold" : "text-gray-500"
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
                        ? "bg-[#1a1a1a] text-gray-400 hover:bg-[#222]"
                        : e.status === "scheduled"
                          ? "bg-teal-500/15 text-teal-300 hover:bg-teal-500/25"
                          : "bg-[#1a1a1a] text-gray-300 hover:bg-[#222]"
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
      <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-teal-500/15 border border-teal-500/40" />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#1a1a1a] border border-[#252525]" />
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
      className="border-t border-[#1f1f1f] pt-6"
    >
      <h2
        id="drafts-heading"
        className="text-sm uppercase tracking-[0.2em] text-gray-300 font-mono mb-3"
      >
        Drafts (no schedule)
      </h2>
      <ul className="rounded-xl border border-[#252525] bg-[#111111] divide-y divide-[#1f1f1f]">
        {drafts.map((d) => (
          <li key={d._id}>
            <Link
              href={`/marketing/compose?id=${d._id}`}
              className="block px-4 py-3 text-sm text-gray-300 hover:text-teal-400 hover:bg-[#0c0c0c] transition-colors"
            >
              {d.subjectLine || "Untitled draft"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
