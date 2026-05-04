"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const CATEGORY_PRESETS = [
  "Rehearsal hire",
  "Equipment",
  "Travel",
  "Marketing spend",
  "Production",
  "Subscriptions",
  "Other",
];

type Expense = {
  _id: Id<"expenses">;
  date: number;
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
};

export default function ExpensesPage() {
  const expenses = useQuery(api.expenses.list, {});
  const create = useMutation(api.expenses.create);
  const remove = useMutation(api.expenses.remove);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "Other",
    description: "",
    receiptUrl: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setError("");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be positive");
      return;
    }
    if (!form.description.trim()) {
      setError("Description required");
      return;
    }
    setSaving(true);
    try {
      await create({
        date: new Date(form.date).getTime(),
        amount,
        category: form.category,
        description: form.description,
        receiptUrl: form.receiptUrl || undefined,
      });
      setForm({
        date: new Date().toISOString().slice(0, 10),
        amount: "",
        category: "Other",
        description: "",
        receiptUrl: "",
      });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wide text-text-muted">
          Expenses ({expenses?.length ?? 0})
        </h2>
        <button
          onClick={() => setAdding(!adding)}
          className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold"
        >
          {adding ? "Cancel" : "+ Add expense"}
        </button>
      </div>

      {adding && (
        <div className="bg-bg-card border border-border-crm rounded p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(v) => setForm({ ...form, date: v })}
            />
            <Input
              label="Amount (£)"
              type="number"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: v })}
            />
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-text-muted">
                Category
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
              >
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <Input
              label="Receipt URL"
              value={form.receiptUrl}
              onChange={(v) => setForm({ ...form, receiptUrl: v })}
              placeholder="(optional)"
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
          />
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="bg-accent text-bg-base px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save expense"}
          </button>
        </div>
      )}

      {expenses === undefined ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-text-muted">No expenses recorded yet.</p>
      ) : (
        <table className="w-full text-sm bg-bg-surface border border-border-crm rounded">
          <thead className="border-b border-border-crm">
            <tr className="text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(expenses as Expense[]).map((e) => (
              <tr key={e._id} className="border-t border-border-crm">
                <td className="p-3 text-text-muted">
                  {new Date(e.date).toLocaleDateString("en-GB")}
                </td>
                <td className="p-3 text-text-body">{e.category}</td>
                <td className="p-3 text-text-primary">
                  {e.description}
                  {e.receiptUrl && (
                    <a
                      href={e.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-xs text-accent hover:text-accent-hover"
                    >
                      receipt ↗
                    </a>
                  )}
                </td>
                <td className="p-3 text-right text-text-body">
                  £{e.amount.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => remove({ id: e._id })}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 bg-bg-surface border border-border-crm rounded p-2 text-sm"
      />
    </label>
  );
}
