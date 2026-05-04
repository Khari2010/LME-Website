"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";

export default function ContractsPage() {
  const contracts = useQuery(api.finance.getContractsView, {});
  if (contracts === undefined) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  return contracts.length === 0 ? (
    <p className="text-sm text-text-muted">No contracts sent yet.</p>
  ) : (
    <table className="w-full text-sm bg-bg-surface border border-border-crm rounded">
      <thead className="border-b border-border-crm">
        <tr className="text-text-muted text-xs uppercase tracking-wider">
          <th className="text-left p-3">Event</th>
          <th className="text-left p-3">Event Date</th>
          <th className="text-left p-3">Client</th>
          <th className="text-left p-3">Sent</th>
          <th className="text-left p-3">Signed</th>
        </tr>
      </thead>
      <tbody>
        {contracts.map((c) => (
          <tr key={c.eventId} className="border-t border-border-crm">
            <td className="p-3">
              <Link
                href={`/events/${c.eventId}`}
                className="text-text-primary hover:text-accent"
              >
                {c.eventName}
              </Link>
            </td>
            <td className="p-3 text-text-muted">
              {new Date(c.eventDate).toLocaleDateString("en-GB")}
            </td>
            <td className="p-3 text-text-body">{c.clientName ?? "—"}</td>
            <td className="p-3 text-text-muted">
              {c.sentAt
                ? new Date(c.sentAt).toLocaleDateString("en-GB")
                : "—"}
            </td>
            <td className="p-3">
              {c.signedAt ? (
                <span className="text-success">
                  {c.signedByName ?? "Signed"} on{" "}
                  {new Date(c.signedAt).toLocaleDateString("en-GB")}
                </span>
              ) : (
                <span className="text-text-muted">Awaiting signature</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
