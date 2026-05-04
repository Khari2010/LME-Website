import { ReactNode } from "react";

export function Stat({
  label,
  value,
  sub,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueColor =
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
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  );
}
