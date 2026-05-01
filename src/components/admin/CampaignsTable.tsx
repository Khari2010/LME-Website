"use client";

import { useMemo, useState } from "react";

type CampaignRow = {
  _id: string;
  subjectLine: string;
  sentDate: number;
  recipientCount: number;
  recipientTags: string[];
};

type SortKey = "subject" | "sentDate" | "recipients";
type SortDir = "asc" | "desc";

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
          active ? "text-teal-400" : "text-gray-500 hover:text-gray-300"
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
  const [sortKey, setSortKey] = useState<SortKey>("sentDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const list = [...campaigns];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "subject") cmp = a.subjectLine.localeCompare(b.subjectLine);
      else if (sortKey === "sentDate") cmp = a.sentDate - b.sentDate;
      else if (sortKey === "recipients") cmp = a.recipientCount - b.recipientCount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [campaigns, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "subject" ? "asc" : "desc");
    }
  }

  return (
    <div className="rounded-xl border border-[#252525] bg-[#111111] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Email campaign history with performance metrics
          </caption>
          <thead className="border-b border-[#1f1f1f]">
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
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono font-medium">
                Tags
              </th>
              <th className="py-3 px-4 text-left text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 px-4 text-center text-gray-500">
                  No campaigns sent yet. Click{" "}
                  <span className="text-teal-400">New campaign</span> to send your
                  first.
                </td>
              </tr>
            ) : (
              sorted.map((c) => (
                <tr
                  key={c._id}
                  className="border-b border-[#1f1f1f] last:border-b-0 hover:bg-[#0c0c0c] transition-colors"
                >
                  <td className="py-3 px-4 text-white font-medium max-w-md">
                    <div className="truncate">{c.subjectLine}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                    {formatDate(c.sentDate)}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {c.recipientCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {c.recipientTags.length === 0 ? (
                      <span className="text-gray-600">—</span>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {c.recipientTags.map((t) => (
                          <span
                            key={t}
                            className="inline-block px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#252525] text-gray-400 font-mono text-[10px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
                      Sent
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
