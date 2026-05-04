"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function CashflowPage() {
  const data = useQuery(api.finance.getCashflowSummary, { quarters: 4 });
  if (data === undefined) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Revenue (last 4 quarters)"
          value={`£${data.totalRevenue.toLocaleString()}`}
          tone="positive"
        />
        <KpiCard
          label="Expenses"
          value={`£${data.totalExpenses.toLocaleString()}`}
          tone="negative"
        />
        <KpiCard
          label="Net"
          value={`£${data.net.toLocaleString()}`}
          tone={data.net >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="bg-bg-surface border border-border-crm rounded p-4">
        <h2 className="text-sm uppercase tracking-wide text-text-muted mb-3">
          By quarter
        </h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-text-muted">
            <tr>
              <th className="text-left py-2">Quarter</th>
              <th className="text-right py-2">Revenue</th>
              <th className="text-right py-2">Expenses</th>
              <th className="text-right py-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {data.quarters.map((q) => (
              <tr key={q.label} className="border-t border-border-crm">
                <td className="py-2 text-text-body">{q.label}</td>
                <td className="py-2 text-right text-success">
                  £{q.revenue.toLocaleString()}
                </td>
                <td className="py-2 text-right text-text-body">
                  £{q.expenses.toLocaleString()}
                </td>
                <td
                  className={`py-2 text-right font-semibold ${
                    q.net >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  £{q.net.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const colorClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-danger"
        : "text-text-primary";
  return (
    <div className="bg-bg-surface border border-border-crm rounded p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
