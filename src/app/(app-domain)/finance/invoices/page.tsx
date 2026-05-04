"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";

type Filter = "all" | "pending" | "overdue" | "paid";

export default function InvoicesPage() {
  const invoices = useQuery(api.finance.getInvoicesView, {});
  const [filter, setFilter] = useState<Filter>("all");

  if (invoices === undefined) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const filtered = invoices.filter((i) => {
    if (filter === "all") return true;
    if (filter === "overdue") return i.overdue;
    if (filter === "paid") return i.depositPaid && i.balancePaid;
    if (filter === "pending") return !i.balancePaid && !i.overdue;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(["all", "pending", "overdue", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2 py-1 rounded border ${
              filter === f
                ? "border-accent text-accent"
                : "border-border-crm text-text-muted"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">No invoices match.</p>
      ) : (
        <table className="w-full text-sm bg-bg-surface border border-border-crm rounded">
          <thead className="border-b border-border-crm">
            <tr className="text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Client</th>
              <th className="text-right p-3">Fee</th>
              <th className="text-right p-3">Deposit</th>
              <th className="text-right p-3">Balance</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr
                key={i.eventId}
                className={`border-t border-border-crm ${
                  i.overdue ? "bg-danger/5" : ""
                }`}
              >
                <td className="p-3">
                  <Link
                    href={`/events/${i.eventId}`}
                    className="text-text-primary hover:text-accent"
                  >
                    {i.eventName}
                  </Link>
                </td>
                <td className="p-3 text-text-muted">
                  {new Date(i.eventDate).toLocaleDateString("en-GB")}
                </td>
                <td className="p-3 text-text-body">{i.clientName ?? "—"}</td>
                <td className="p-3 text-right">
                  {i.fee != null ? `£${i.fee}` : "—"}
                </td>
                <td className="p-3 text-right">
                  {i.depositAmount != null ? (
                    <span
                      className={
                        i.depositPaid ? "text-success" : "text-text-muted"
                      }
                    >
                      £{i.depositAmount}
                      {i.depositPaid ? " ✓" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-right">
                  {i.balanceAmount != null ? (
                    <span
                      className={
                        i.balancePaid ? "text-success" : "text-text-muted"
                      }
                    >
                      £{i.balanceAmount}
                      {i.balancePaid ? " ✓" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-xs">
                  {i.depositPaid && i.balancePaid ? (
                    <span className="text-success">Paid</span>
                  ) : i.overdue ? (
                    <span className="text-danger">Overdue</span>
                  ) : (
                    <span className="text-text-muted">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
