"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export default function SetlistTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });

  if (event === undefined) return null;
  if (!event) return null;

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-text-muted text-sm">
        Structured setlists land in <strong>Phase 4 (Music module)</strong>.
        For Phase 1a, jot setlist notes in the Overview Notes textarea.
      </p>
    </div>
  );
}
