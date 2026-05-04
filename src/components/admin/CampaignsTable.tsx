"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CampaignRow = {
  _id: string;
  _creationTime: number;
  status?: "draft" | "scheduled" | "sent";
  subjectLine: string;
  sentDate?: number;
  scheduledAt?: number;
  recipientCount?: number;
  recipientTags?: string[];
};

type SortKey = "subject" | "sentDate" | "recipients";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "draft" | "scheduled" | "sent";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="py-3 px-4 font-medium text-left">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono transition-colors ${
          active ? "text-accent" : "text-text-muted hover:text-text-body"
        }`}
      >
        {label}
        <span aria-hidden="true" className="text-[8px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

export default function CampaignsTable({
  campaigns,
}: {
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("sentDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    return campaigns.filter((c) => (c.status ?? "sent") === statusFilter);
  }, [campaigns, statusFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "subject") {
        cmp = a.subjectLine.localeCompare(b.subjectLine);
      } else if (sortKey === "sentDate") {
        // Drafts have no sentDate — fall back to creation time so they still sort.
        const aDate = a.sentDate ?? a._creationTime;
        const bDate = b.sentDate ?? b._creationTime;
        cmp = aDate - bDate;
      } else if (sortKey === "recipients") {
        cmp = (a.recipientCount ?? 0) - (b.recipientCount ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "subject" ? "asc" : "desc");
    }
  }

  function handleRowClick(c: CampaignRow) {
    // Drafts and scheduled campaigns both jump back into the composer.
    if (c.status === "draft" || c.status === "scheduled") {
      router.push(`/marketing/compose?draft=${c._id}`);
    } else {
      router.push(`/marketing/campaigns/${c._id}`);
    }
  }

  const filterCounts = useMemo(() => {
    let drafts = 0;
    let scheduled = 0;
    let sent = 0;
    for (const c of campaigns) {
      const s = c.status ?? "sent";
      if (s === "draft") drafts++;
      else if (s === "scheduled") scheduled++;
      else sent++;
    }
    return { all: campaigns.length, drafts, scheduled, sent };
  }, [campaigns]);

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Filter by status"
        className="inline-flex gap-1 p-1 border border-border-crm rounded-md bg-bg-surface"
      >
        {(
          [
            { id: "all" as const, label: "All", count: filterCounts.all },
            { id: "draft" as const, label: "Drafts", count: filterCounts.drafts },
            {
              id: "scheduled" as const,
              label: "Scheduled",
              count: filterCounts.scheduled,
            },
            { id: "sent" as const, label: "Sent", count: filterCounts.sent },
          ]
        ).map((f) => {
          const active = statusFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-mono rounded transition-colors ${
                active
                  ? "bg-accent text-bg-base"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {f.label}{" "}
              <span className={active ? "text-bg-base/70" : "text-text-muted"}>
                ({f.count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border-crm bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Email campaign history with performance metrics
            </caption>
            <thead className="border-b border-border-crm">
              <tr>
                <SortHeader
                  label="Subject"
                  active={sortKey === "subject"}
                  dir={sortDir}
                  onClick={() => toggleSort("subject")}
                />
                <SortHeader
                  label="Sent date"
                  active={sortKey === "sentDate"}
                  dir={sortDir}
                  onClick={() => toggleSort("sentDate")}
                />
                <SortHeader
                  label="Recipients"
                  active={sortKey === "recipients"}
                  dir={sortDir}
                  onClick={() => toggleSort("recipients")}
                />
                <th className="py-3 px-4 text-left text-[10px] uppercase tracking-[0.18em] text-text-muted font-mono font-medium">
                  Tags
                </th>
                <th className="py-3 px-4 text-left text-[10px] uppercase tracking-[0.18em] text-text-muted font-mono font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center text-text-muted">
                    No campaigns yet. Click{" "}
                    <span className="text-accent">New campaign</span> to start
                    your first.
                  </td>
                </tr>
              ) : (
                sorted.map((c) => {
                  const status = c.status ?? "sent";
                  const isDraft = status === "draft";
                  const isScheduled = status === "scheduled";
                  const dateLabel = isDraft
                    ? `Edited ${formatDate(c._creationTime)}`
                    : isScheduled && c.scheduledAt
                      ? `Sends ${formatDate(c.scheduledAt)}`
                      : c.sentDate
                        ? formatDate(c.sentDate)
                        : "—";
                  return (
                    <tr
                      key={c._id}
                      onClick={() => handleRowClick(c)}
                      className="border-b border-border-crm last:border-b-0 transition-colors cursor-pointer hover:bg-bg-card"
                    >
                      <td className="py-3 px-4 text-text-primary font-medium max-w-md">
                        <div className="truncate">
                          {c.subjectLine || (
                            <span className="text-text-muted italic">
                              (untitled draft)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-muted whitespace-nowrap">
                        {dateLabel}
                      </td>
                      <td className="py-3 px-4 text-text-muted">
                        {isDraft || isScheduled ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          (c.recipientCount ?? 0).toLocaleString()
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-muted text-xs">
                        {!c.recipientTags || c.recipientTags.length === 0 ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <div className="flex gap-1 flex-wrap">
                            {c.recipientTags.map((t) => (
                              <span
                                key={t}
                                className="inline-block px-1.5 py-0.5 rounded bg-bg-card border border-border-crm text-text-muted font-mono text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isDraft ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            Draft
                          </span>
                        ) : isScheduled ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30">
                            Scheduled
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-mono bg-accent/10 text-accent-hover border border-accent/30">
                            Sent
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
