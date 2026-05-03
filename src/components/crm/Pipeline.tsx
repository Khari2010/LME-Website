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

// Maps full lifecycle statuses to the 8 visible kanban stages.
// Phase-1b-only statuses bucket into their Phase-1a equivalent.
const STATUS_TO_STAGE: Record<EventStatus, (typeof STAGES)[number] | undefined> = {
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
export function isPipelineStage(s: string): s is (typeof STAGES)[number] {
  return (STAGES as readonly string[]).includes(s);
}

export function Pipeline({ events }: { events: readonly EventSummary[] }) {
  const byStage = new Map<(typeof STAGES)[number], EventSummary[]>(
    STAGES.map((s) => [s, []]),
  );
  for (const e of events) {
    const stage = STATUS_TO_STAGE[e.status];
    if (!stage) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Pipeline: skipping event with unmapped status "${e.status}"`, e._id);
      }
      continue;
    }
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
