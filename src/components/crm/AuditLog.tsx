"use client";

const ACTION_LABELS: Record<string, string> = {
  contract_sent: "Contract sent to client",
  contract_signed: "Client signed contract",
  contract_viewed: "Client viewed contract",
  invoice_sent: "Invoice sent to client",
  payment_received: "Payment received",
};

type AuditEntry = {
  ts: number;
  action: string;
  ip?: string;
};

export function AuditLog({ entries }: { entries: AuditEntry[] | undefined }) {
  if (!entries || entries.length === 0) {
    return <p className="text-xs text-text-muted">No client activity yet.</p>;
  }

  const sorted = [...entries].sort((a, b) => b.ts - a.ts);

  return (
    <ol className="space-y-2 text-sm">
      {sorted.map((entry, i) => (
        <li key={`${entry.ts}-${i}`} className="flex items-start gap-3">
          <span className="text-text-muted font-mono text-xs whitespace-nowrap mt-0.5">
            {new Date(entry.ts).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-text-body">
            {ACTION_LABELS[entry.action] ?? entry.action}
            {entry.ip && (
              <span className="text-text-muted text-xs ml-2 font-mono">({entry.ip})</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
