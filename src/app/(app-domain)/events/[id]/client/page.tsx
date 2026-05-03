"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function ClientTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });

  if (event === undefined) return null;
  if (!event) return null;

  const c = event.client;

  const fields: Array<[string, string | undefined]> = [
    ["Name", c?.name],
    ["Email", c?.email],
    ["Phone", c?.phone],
    ["Address", c?.address],
  ];

  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      {fields.map(([label, value]) => (
        <div key={label} className="bg-bg-surface border border-border-crm rounded p-3">
          <dt className="text-xs uppercase tracking-wide text-text-muted mb-1">{label}</dt>
          <dd className="text-text-body">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
