"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { AuditLog } from "@/components/crm/AuditLog";

export default function FinanceLegalTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { id: id as Id<"events"> });
  const updateEvent = useMutation(api.events.update);
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDue, setBalanceDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync server → local form values when the event loads or its id changes.
  // Re-syncing on every finance write would clobber an in-progress edit, so
  // we key on `_id` only — switching events resets the form, but live remote
  // updates to the same event don't.
  useEffect(() => {
    if (event?.finance) {
      setFee(event.finance.fee?.toString() ?? "");
      setDepositAmount(event.finance.deposit?.amount?.toString() ?? "");
      setBalanceAmount(event.finance.balance?.amount?.toString() ?? "");
      setBalanceDue(
        event.finance.balance?.dueDate
          ? new Date(event.finance.balance.dueDate).toISOString().slice(0, 10)
          : "",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?._id]);

  if (event === undefined) return null;
  if (!event) return null;

  const f = event.finance;
  const c = event.contract;

  async function handleSave() {
    setError("");
    const feeNum = Number(fee);
    if (!Number.isFinite(feeNum) || feeNum <= 0) {
      setError("Fee must be a positive number.");
      return;
    }
    const depNum = depositAmount ? Number(depositAmount) : undefined;
    const balNum = balanceAmount ? Number(balanceAmount) : undefined;
    if (depNum != null && (!Number.isFinite(depNum) || depNum < 0 || depNum > feeNum)) {
      setError("Deposit must be between 0 and the fee.");
      return;
    }
    if (balNum != null && (!Number.isFinite(balNum) || balNum < 0)) {
      setError("Balance amount must be a non-negative number.");
      return;
    }

    // Preserve paid/paidAt on existing deposit/balance objects so saving the
    // editor doesn't accidentally reset payment state. Only the editable
    // fields (amount + due date) come from the form.
    const patch: Record<string, unknown> = { fee: feeNum };
    if (depNum != null) {
      patch.deposit = {
        amount: depNum,
        paid: f?.deposit?.paid ?? false,
        paidAt: f?.deposit?.paidAt,
      };
    }
    if (balNum != null && balanceDue) {
      patch.balance = {
        amount: balNum,
        dueDate: new Date(balanceDue).getTime(),
        paid: f?.balance?.paid ?? false,
        paidAt: f?.balance?.paidAt,
      };
    }
    if (f?.xeroDepositInvoiceRef) patch.xeroDepositInvoiceRef = f.xeroDepositInvoiceRef;
    if (f?.xeroBalanceInvoiceRef) patch.xeroBalanceInvoiceRef = f.xeroBalanceInvoiceRef;

    setSaving(true);
    try {
      await updateEvent({ id: id as Id<"events">, patch: { finance: patch } });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
    setError("");
    // Restore form fields from current server state so a subsequent edit
    // starts from the saved values, not the abandoned ones.
    setFee(f?.fee?.toString() ?? "");
    setDepositAmount(f?.deposit?.amount?.toString() ?? "");
    setBalanceAmount(f?.balance?.amount?.toString() ?? "");
    setBalanceDue(
      f?.balance?.dueDate
        ? new Date(f.balance.dueDate).toISOString().slice(0, 10)
        : "",
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <section className="bg-bg-surface border border-border-crm rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-wide text-text-muted">Finance</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-accent hover:text-accent-hover"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <FinField label="Fee (£)" value={fee} onChange={setFee} type="number" />
            <FinField label="Deposit amount (£)" value={depositAmount} onChange={setDepositAmount} type="number" />
            <div className="grid grid-cols-2 gap-2">
              <FinField label="Balance amount (£)" value={balanceAmount} onChange={setBalanceAmount} type="number" />
              <FinField label="Balance due date" value={balanceDue} onChange={setBalanceDue} type="date" />
            </div>
            {error && <p role="alert" className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded text-sm border border-border-crm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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
            <p className="text-text-muted text-xs mt-2">Xero auto-raise lands when OAuth is configured.</p>
          </>
        )}
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

function FinField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-bg-card border border-border-crm rounded p-2 text-text-body text-sm"
      />
    </label>
  );
}
