"use client";

import { EventCard } from "./EventCard";

const STAGES = [
  "Inquiry",
  "InitialReview",
  "Quoting",
  "ContractSent",
  "ContractSigned",
  "Booked",
  "EventDay",
  "Completed",
] as const;

const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  Inquiry: "Inquiry",
  InitialReview: "Initial Review",
  Quoting: "Quoting",
  ContractSent: "Contract Sent",
  ContractSigned: "Signed",
  Booked: "Booked",
  EventDay: "Event Day",
  Completed: "Completed",
};

// Narrow projection of the Convex event doc that Pipeline + EventCard actually
// render. Convex's `listByFamily` returns the full `eventDocValidator` shape;
// this type is structurally compatible with that — any extra fields on the
// query result are simply ignored.
export type EventSummary = {
  _id: string;
  name: string;
  status: string;
  startDate: number;
  client?: { name: string } | undefined;
  venue?: { name: string } | undefined;
};

export function Pipeline({ events }: { events: readonly EventSummary[] }) {
  const byStage = new Map<string, EventSummary[]>(STAGES.map((s) => [s, []]));
  for (const e of events) {
    const stage = (STAGES as readonly string[]).includes(e.status) ? e.status : "Inquiry";
    byStage.get(stage)!.push(e);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {STAGES.map((stage) => (
        <div
          key={stage}
          className="bg-bg-card border border-border-crm rounded p-3 min-h-[300px]"
        >
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-3 flex items-center justify-between">
            {STAGE_LABELS[stage]}
            <span className="bg-bg-surface px-1.5 py-0.5 rounded text-text-body">
              {byStage.get(stage)!.length}
            </span>
          </h3>
          <div className="space-y-2">
            {byStage.get(stage)!.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
