"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";

type ContactRow = {
  _id: string;
  email: string;
  name?: string;
  tags: string[];
  status: "active" | "unsubscribed" | "bounced";
  signupDate: number;
  source: "enhancers-signup" | "booking-inquiry" | "manual";
  location?: string;
};

type StatusFilter = "all" | "active" | "unsubscribed" | "bounced";
type SortKey = "name" | "email" | "signupDate";
type SortDir = "asc" | "desc";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: ContactRow["status"] }) {
  const cls =
    status === "active"
      ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
      : status === "unsubscribed"
        ? "bg-gray-500/10 text-gray-400 border-gray-700"
        : "bg-red-500/10 text-red-300 border-red-500/30";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-mono border ${cls}`}
    >
      {status}
    </span>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="py-3 px-4 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono transition-colors ${
          active ? "text-teal-400" : "text-gray-500 hover:text-gray-300"
        }`}
      >
        {label}
        <span aria-hidden="true" className="text-[8px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

type Toast = { kind: "ok" | "err"; msg: string } | null;

export default function ContactsTable({
  contacts,
}: {
  contacts: ContactRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("signupDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = contacts;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (q) {
      list = list.filter((c) => {
        return (
          c.email.toLowerCase().includes(q) ||
          (c.name?.toLowerCase().includes(q) ?? false) ||
          (c.location?.toLowerCase().includes(q) ?? false) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.name ?? "").localeCompare(b.name ?? "");
      } else if (sortKey === "email") {
        cmp = a.email.localeCompare(b.email);
      } else {
        cmp = a.signupDate - b.signupDate;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [contacts, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "signupDate" ? "desc" : "asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <label htmlFor="contact-search" className="sr-only">
            Search contacts
          </label>
          <input
            id="contact-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, location, or tag…"
            className="w-full bg-[#080808] border border-[#252525] rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
          />
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
            aria-hidden="true"
          >
            ⌕
          </span>
        </div>
        <label className="sr-only" htmlFor="status-filter">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
        <p
          className="text-xs text-gray-500 font-mono ml-auto"
          aria-live="polite"
        >
          {filtered.length} of {contacts.length}
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-3 py-2 rounded-md text-sm font-medium bg-teal-500 hover:bg-teal-400 text-black transition-colors"
        >
          + Add contact
        </button>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-md border px-3 py-2 text-sm ${
            toast.kind === "ok"
              ? "bg-teal-500/10 border-teal-500/30 text-teal-200"
              : "bg-red-500/10 border-red-500/30 text-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {addOpen && (
        <AddContactModal
          onClose={() => setAddOpen(false)}
          onSuccess={(msg) => {
            setToast({ kind: "ok", msg });
            setAddOpen(false);
            router.refresh();
          }}
        />
      )}

      <div className="rounded-xl border border-[#252525] bg-[#111111] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Subscriber contacts list</caption>
            <thead className="border-b border-[#1f1f1f]">
              <tr>
                <SortHeader
                  label="Name"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => toggleSort("name")}
                />
                <SortHeader
                  label="Email"
                  active={sortKey === "email"}
                  dir={sortDir}
                  onClick={() => toggleSort("email")}
                />
                <th className="py-3 px-4 text-left font-medium text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono">
                  Tags
                </th>
                <SortHeader
                  label="Joined"
                  active={sortKey === "signupDate"}
                  dir={sortDir}
                  onClick={() => toggleSort("signupDate")}
                />
                <th className="py-3 px-4 text-left font-medium text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 px-4 text-center text-gray-500"
                  >
                    {search || statusFilter !== "all"
                      ? "No contacts match your filters."
                      : "No contacts yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b border-[#1f1f1f] last:border-b-0 hover:bg-[#0c0c0c] transition-colors"
                  >
                    <td className="py-3 px-4 text-white">
                      {c.name ? (
                        c.name
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                      {c.email}
                    </td>
                    <td className="py-3 px-4">
                      {c.tags.length === 0 ? (
                        <span className="text-gray-600">—</span>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {c.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-block px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#252525] text-gray-400 font-mono text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {formatDate(c.signupDate)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddContactModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const addManualContact = useMutation(api.contacts.addManualContact);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const result = await addManualContact({
        email: trimmedEmail,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        tags,
      });
      const display =
        [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
        trimmedEmail;
      onSuccess(
        result.created
          ? `Added ${display} to contacts`
          : `Updated ${display} — already in list`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-contact-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[#252525] bg-[#111111] shadow-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h2
              id="add-contact-title"
              className="text-2xl text-white"
              style={{
                fontFamily: "var(--font-bebas-neue)",
                letterSpacing: "0.04em",
              }}
            >
              Add contact
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="add-contact-email"
                className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono mb-1"
              >
                Email <span className="text-teal-400">*</span>
              </label>
              <input
                id="add-contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@example.com"
                className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="add-contact-first"
                  className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono mb-1"
                >
                  First name
                </label>
                <input
                  id="add-contact-first"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label
                  htmlFor="add-contact-last"
                  className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono mb-1"
                >
                  Last name
                </label>
                <input
                  id="add-contact-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="add-contact-tags"
                className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 font-mono mb-1"
              >
                Tags
              </label>
              <input
                id="add-contact-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="manual, vip, newsletter"
                className="w-full bg-[#080808] border border-[#252525] rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
              <p className="text-[10px] text-gray-600 mt-1 font-mono">
                Comma-separated. Defaults to &quot;manual&quot; if empty.
              </p>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-md text-sm text-gray-300 border border-[#252525] hover:bg-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-2 rounded-md text-sm font-medium bg-teal-500 hover:bg-teal-400 text-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding…" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
