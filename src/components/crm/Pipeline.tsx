"use client";

import { EventCard } from "./EventCard";

const DEFAULT_STAGES = [
  "Inquiry",
  "InitialReview",
  "Quoting",
  "ContractSent",
  "ContractSigned",
  "Booked",
  "EventDay",
  "Completed",
] as const;

const DEFAULT_STAGE_LABELS: Record<string, string> = {
  Inquiry: "Inquiry",
  InitialReview: "Initial Review",
  Quoting: "Quoting",
  ContractSent: "Contract Sent",
  ContractSigned: "Signed",
  Booked: "Booked",
  EventDay: "Event Day",
  Completed: "Completed",
};

// Full lifecycle status union — covers Phase 1a + 1b external booking flow,
// Phase 3 internal-show flow, Phase 4 team-diary flow, and shared terminal states.
export type EventStatus =
  // External booking lifecycle (Phase 1a + 1b)
  | "Inquiry" | "InitialReview" | "BookingFormSent" | "FormReturned"
  | "DiscoveryCall" | "Quoting" | "ContractSent" | "ContractSigned"
  | "AwaitingDeposit" | "Booked" | "PreEvent" | "EventDay"
  | "AwaitingBalance" | "Completed"
  // Internal show lifecycle (Phase 3)
  | "Planning" | "InProduction" | "Confirmed" | "ReadyForShow" | "Live"
  // Team diary lifecycle (Phase 4)
  | "Scheduled" | "InProgress"
  // Terminal states (any family)
  | "Cancelled" | "Lost" | "Postponed";

// Narrow projection of the Convex event doc that Pipeline + EventCard actually
// render. Convex's `listByFamily` returns the full `eventDocValidator` shape;
// this type is structurally compatible with that — any extra fields on the
// query result are simply ignored.
export type EventSummary = {
  _id: string;
  name: string;
  status: EventStatus;
  startDate: number;
  client?: { name: string } | undefined;
  venue?: { name: string } | undefined;
};

// Maps full lifecycle statuses to the 8 visible External Bookings kanban stages.
// Phase-1b-only statuses bucket into their Phase-1a equivalent.
const DEFAULT_STATUS_TO_STAGE: Partial<Record<EventStatus, EventStatus | undefined>> = {
  // Direct mappings (Phase 1a)
  Inquiry: "Inquiry",
  InitialReview: "InitialReview",
  Quoting: "Quoting",
  ContractSent: "ContractSent",
  ContractSigned: "ContractSigned",
  Booked: "Booked",
  EventDay: "EventDay",
  Completed: "Completed",

  // Phase-1b bucketing
  BookingFormSent: "InitialReview",
  FormReturned: "InitialReview",
  DiscoveryCall: "InitialReview",
  AwaitingDeposit: "ContractSigned",
  PreEvent: "Booked",
  AwaitingBalance: "EventDay",

  // Internal-show + team-diary states render outside External Bookings —
  // hidden via undefined so the External Bookings kanban never shows them.
  Planning: undefined,
  InProduction: undefined,
  Confirmed: undefined,
  ReadyForShow: undefined,
  Live: undefined,
  Scheduled: undefined,
  InProgress: undefined,

  // Terminal — hidden from active kanban (Cancelled/Lost get a future archive view)
  Cancelled: undefined,
  Lost: undefined,
  Postponed: undefined,
};

// Type guard for runtime narrowing — useful when a string of unknown origin
// needs to be checked against the visible kanban stage list.
export function isPipelineStage(s: string): s is (typeof DEFAULT_STAGES)[number] {
  return (DEFAULT_STAGES as readonly string[]).includes(s);
}

// Tailwind grid-cols-* classes can't be computed at runtime — they must appear
// as literal strings so the JIT picks them up. This map covers the column
// counts we use across pipelines (External=8, Internal=6) and degrades safely
// for anything unexpected.
const GRID_COLS_LG: Record<number, string> = {
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",
  8: "lg:grid-cols-8",
};

export function Pipeline({
  events,
  stages = DEFAULT_STAGES,
  stageLabels = DEFAULT_STAGE_LABELS,
  statusToStage = DEFAULT_STATUS_TO_STAGE,
}: {
  events: readonly EventSummary[];
  stages?: readonly EventStatus[];
  stageLabels?: Record<string, string>;
  statusToStage?: Partial<Record<EventStatus, EventStatus | undefined>>;
}) {
  const byStage = new Map<EventStatus, EventSummary[]>(
    stages.map((s) => [s, []]),
  );
  for (const e of events) {
    const stage = statusToStage[e.status];
    if (!stage || !byStage.has(stage)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Pipeline: skipping event with unmapped status "${e.status}"`, e._id);
      }
      continue;
    }
    byStage.get(stage)!.push(e);
  }

  const lgCols = GRID_COLS_LG[stages.length] ?? "lg:grid-cols-8";

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 ${lgCols} gap-3`}>
      {stages.map((stage) => (
        <div
          key={stage}
          className="bg-bg-card border border-border-crm rounded p-3 min-h-[300px]"
        >
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-3 flex items-center justify-between">
            {stageLabels[stage] ?? stage}
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
