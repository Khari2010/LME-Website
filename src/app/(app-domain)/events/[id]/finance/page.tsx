"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { AuditLog } from "@/components/crm/AuditLog";

export default function FinanceLegalTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });

  if (event === undefined) return null;
  if (!event) return null;

  const f = event.finance;
  const c = event.contract;

  return (
    <div className="space-y-4 max-w-2xl">
      <section className="bg-bg-surface border border-border-crm rounded p-4">
        <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Finance</h2>
        <p className="text-text-body">Fee: {f?.fee != null ? `£${f.fee}` : "—"}</p>
        <p className="text-text-body">
          Deposit: {f?.deposit ? `£${f.deposit.amount} ${f.deposit.paid ? "✓ paid" : "(pending)"}` : "—"}
        </p>
        <p className="text-text-body">
          Balance:{" "}
          {f?.balance
            ? `£${f.balance.amount} ${f.balance.paid ? "✓ paid" : "(due " + new Date(f.balance.dueDate).toLocaleDateString("en-GB") + ")"}`
            : "—"}
        </p>
        {(f?.xeroDepositInvoiceRef || f?.xeroBalanceInvoiceRef) && (
          <p className="text-text-muted text-xs mt-2 font-mono">
            Xero refs: {[f?.xeroDepositInvoiceRef, f?.xeroBalanceInvoiceRef].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-text-muted text-xs mt-2">Xero auto-raise + webhook updates land later in Phase 1b.</p>
      </section>

      <section className="bg-bg-surface border border-border-crm rounded p-4">
        <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Contract</h2>
        <p className="text-text-body">
          {c?.signedAt
            ? `Signed by ${c.signedByName} on ${new Date(c.signedAt).toLocaleDateString("en-GB")}`
            : c?.sentAt
              ? `Sent ${new Date(c.sentAt).toLocaleDateString("en-GB")} — awaiting signature`
              : "Not yet sent"}
        </p>
        {c?.templateId && (
          <p className="text-text-muted text-xs mt-1">Template: {c.templateId}</p>
        )}
      </section>

      <section className="bg-bg-surface border border-border-crm rounded p-4">
        <h2 className="text-sm uppercase tracking-wide text-text-muted mb-2">Audit log</h2>
        <AuditLog entries={c?.auditLog} />
      </section>
    </div>
  );
}
