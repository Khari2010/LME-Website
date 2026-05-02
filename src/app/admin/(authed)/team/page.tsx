"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../../convex/_generated/api";

type Toast = { kind: "ok" | "err" | "info"; msg: string } | null;

export default function TeamPage() {
  const { user } = useUser();
  const [refreshTick, setRefreshTick] = useState(0);
  const [allowlist, setAllowlist] = useState<
    { id: string; identifier: string; createdAt: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const listAllowlist = useAction(api.allowlist.listAllowlist);
  const addToAllowlist = useAction(api.allowlist.addToAllowlist);
  const removeFromAllowlist = useAction(api.allowlist.removeFromAllowlist);
  const sendTeamInvite = useAction(api.team.sendTeamInvite);

  // Load allowlist on mount and on refreshTick changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAllowlist({})
      .then((items) => {
        if (!cancelled) {
          setAllowlist(items);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setToast({
            kind: "err",
            msg: e instanceof Error ? e.message : "Couldn't load allowlist",
          });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick, listAllowlist]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || adding) return;
    setAdding(true);
    setToast({ kind: "info", msg: `Inviting ${email}…` });
    try {
      await addToAllowlist({ identifier: email });
      const inviterName = user?.firstName ?? "Someone";
      await sendTeamInvite({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || undefined,
        invitedBy: inviterName,
      });
      setToast({ kind: "ok", msg: `Invite sent to ${email}.` });
      setEmail("");
      setFirstName("");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Add failed",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string, identifier: string) {
    if (
      !confirm(
        `Remove ${identifier} from the allowlist? They'll no longer be able to sign up (existing accounts can still sign in).`,
      )
    )
      return;
    try {
      await removeFromAllowlist({ id });
      setToast({ kind: "ok", msg: `Removed ${identifier}.` });
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Remove failed",
      });
    }
  }

  return (
    <div className="space-y-6 text-white">
      <header>
        <p className="text-xs uppercase tracking-widest text-teal-400">
          LME · Admin
        </p>
        <h1 className="text-3xl font-bold mt-1">Team</h1>
        <p className="text-gray-500 text-sm mt-1">
          Invite band members. Only allowlisted emails can sign up.
        </p>
      </header>

      {toast && (
        <div
          className={`rounded px-4 py-2 text-sm ${
            toast.kind === "ok"
              ? "bg-teal-950/40 border border-teal-900 text-teal-300"
              : toast.kind === "err"
                ? "bg-red-950/40 border border-red-900 text-red-300"
                : "bg-gray-900/50 border border-gray-800 text-gray-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Add form */}
      <section className="bg-[#111111] border border-[#252525] rounded-xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">
          Invite a member
        </h2>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
        >
          <div>
            <label
              htmlFor="invite-email"
              className="block text-xs uppercase tracking-widest text-gray-500 mb-2"
            >
              Email *
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reuben@lmeband.com"
              className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="invite-firstName"
              className="block text-xs uppercase tracking-widest text-gray-500 mb-2"
            >
              First name
            </label>
            <input
              id="invite-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Reuben"
              className="w-full bg-[#0a0a0a] border border-[#252525] text-white px-3 py-2 rounded text-sm focus:border-teal-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="bg-teal-400 text-black uppercase tracking-wider font-bold text-sm px-5 py-2 rounded hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {adding ? "Sending…" : "Send invite"}
          </button>
        </form>
      </section>

      {/* Allowlist table */}
      <section className="bg-[#111111] border border-[#252525] rounded-xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-400 mb-4">
          Allowed emails {!loading && `(${allowlist.length})`}
        </h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : allowlist.length === 0 ? (
          <p className="text-gray-500 text-sm">No allowlisted emails yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-[#252525]">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Added</th>
                <th className="py-2 pr-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {allowlist.map((item) => (
                <tr key={item.id} className="border-b border-[#1f1f1f]">
                  <td className="py-2 pr-4">{item.identifier}</td>
                  <td className="py-2 pr-4 text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id, item.identifier)}
                      className="text-red-400 hover:text-red-300 text-xs uppercase tracking-widest"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
