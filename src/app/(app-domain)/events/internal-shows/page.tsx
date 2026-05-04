"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import {
  Pipeline,
  type EventSummary,
  type EventStatus,
} from "@/components/crm/Pipeline";

const STAGES: readonly EventStatus[] = [
  "Planning",
  "InProduction",
  "Confirmed",
  "ReadyForShow",
  "Live",
  "Completed",
];

const STAGE_LABELS: Record<string, string> = {
  Planning: "Planning",
  InProduction: "In Production",
  Confirmed: "Confirmed",
  ReadyForShow: "Ready",
  Live: "Live",
  Completed: "Completed",
};

const STATUS_TO_STAGE: Partial<Record<EventStatus, EventStatus | undefined>> = {
  Planning: "Planning",
  InProduction: "InProduction",
  Confirmed: "Confirmed",
  ReadyForShow: "ReadyForShow",
  Live: "Live",
  Completed: "Completed",
  // Terminal — bucket out of the active kanban.
  Cancelled: undefined,
  Postponed: undefined,
};

export default function InternalShowsPage() {
  const events = useQuery(api.events.listByFamily, { family: "InternalShow" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Internal Shows</h1>
        <Link
          href="/events/new?family=InternalShow"
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold hover:bg-accent-hover"
        >
          + New
        </Link>
      </div>
      {events === undefined ? (
        <p className="text-sm text-text-muted">Loading shows…</p>
      ) : events.length === 0 ? (
        <div className="bg-bg-surface border border-border-crm rounded p-8 text-center">
          <p className="text-text-body mb-2">No internal shows yet.</p>
          <p className="text-sm text-text-muted">
            Create your first Main Show or Pop-Up.
          </p>
        </div>
      ) : (
        <Pipeline
          events={events as EventSummary[]}
          stages={STAGES}
          stageLabels={STAGE_LABELS}
          statusToStage={STATUS_TO_STAGE}
        />
      )}
    </div>
  );
}
