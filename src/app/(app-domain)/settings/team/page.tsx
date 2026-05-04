"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";

type Toast = { kind: "ok" | "err" | "info"; msg: string } | null;

export default function TeamPage() {
  const { user } = useUser();
  const members = useQuery(api.users.listUsers) ?? [];
  const pending = useQuery(api.invitations.listPendingInvitations) ?? [];

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [role, setRole] = useState("admin");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const createInvitation = useAction(api.invitationsAdmin.createInvitation);
  const revokeInvitation = useAction(api.invitationsAdmin.revokeInvitation);
  const resendInvitation = useAction(api.invitationsAdmin.resendInvitation);
  const revokeUserSessions = useAction(api.usersAdmin.revokeUserSessions);
  const removeUser = useAction(api.usersAdmin.removeUser);

  const inviterName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Someone";
  const myClerkId = user?.id;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || adding) return;
    setAdding(true);
    setToast({ kind: "info", msg: `Sending invite to ${email}…` });
    try {
      await createInvitation({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || undefined,
        invitedBy: inviterName,
        role,
      });
      setToast({ kind: "ok", msg: `Invite sent to ${email} as ${role}.` });
      setEmail("");
      setFirstName("");
      setRole("admin");
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Invite failed",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRevokeSessions(clerkUserId: string, label: string) {
    if (!confirm(`Force ${label} to sign in again?`)) return;
    try {
      const result = await revokeUserSessions({ clerkUserId });
      setToast({
        kind: "ok",
        msg: `Revoked ${result.revokedCount} session${result.revokedCount === 1 ? "" : "s"} for ${label}.`,
      });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Revoke failed",
      });
    }
  }

  async function handleRemoveUser(clerkUserId: string, label: string) {
    if (!confirm(`Permanently remove ${label} from the LME admin? They'll need a fresh invite to come back.`)) return;
    try {
      await removeUser({ clerkUserId });
      setToast({ kind: "ok", msg: `Removed ${label}.` });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Remove failed",
      });
    }
  }

  async function handleRevokeInvite(clerkInvitationId: string, inviteEmail: string) {
    if (!confirm(`Revoke the invite for ${inviteEmail}?`)) return;
    try {
      await revokeInvitation({ clerkInvitationId });
      setToast({ kind: "ok", msg: `Revoked invite for ${inviteEmail}.` });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Revoke failed",
      });
    }
  }

  async function handleResendInvite(clerkInvitationId: string, inviteEmail: string) {
    try {
      await resendInvitation({ clerkInvitationId, invitedBy: inviterName });
      setToast({ kind: "ok", msg: `Resent invite to ${inviteEmail}.` });
    } catch (err) {
      setToast({
        kind: "err",
        msg: err instanceof Error ? err.message : "Resend failed",
      });
    }
  }

  function fmtDate(ts: number) {
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtRelative(ts: number | undefined) {
    if (!ts) return "—";
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return fmtDate(ts);
  }
  function displayName(m: { firstName?: string; lastName?: string; email: string }) {
    const full = [m.firstName, m.lastName].filter(Boolean).join(" ");
    return full || m.email;
  }

  return (
    <div className="space-y-6 text-text-primary">
      <header>
        <p className="text-xs uppercase tracking-widest text-accent">LME · Settings</p>
        <h1 className="text-3xl font-bold mt-1">Team</h1>
        <p className="text-text-muted text-sm mt-1">
          Invite band members. Each invite is single-use — recipients land on lmeband.com to set their password.
        </p>
      </header>

      {toast && (
        <div
          className={`rounded px-4 py-2 text-sm ${
            toast.kind === "ok"
              ? "bg-accent/10 border border-accent/40 text-accent-hover"
              : toast.kind === "err"
                ? "bg-red-950/40 border border-red-900 text-red-300"
                : "bg-bg-card border border-border-crm text-text-body"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Invite form */}
      <section className="bg-bg-surface border border-border-crm rounded-xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-text-muted mb-4">Invite a member</h2>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="invite-email" className="block text-xs uppercase tracking-widest text-text-muted mb-2">
              Email *
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reuben@lmeband.com"
              className="w-full bg-bg-base border border-border-crm text-text-primary px-3 py-2 rounded text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="invite-firstName" className="block text-xs uppercase tracking-widest text-text-muted mb-2">
              First name
            </label>
            <input
              id="invite-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Reuben"
              className="w-full bg-bg-base border border-border-crm text-text-primary px-3 py-2 rounded text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-xs uppercase tracking-widest text-text-muted mb-2">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-bg-base border border-border-crm text-text-primary px-3 py-2 rounded text-sm focus:border-accent focus:outline-none"
            >
              <option value="director">Director (full access)</option>
              <option value="admin">Admin (bookings + ticketing)</option>
              <option value="internal-events">Internal Events (Stacey)</option>
              <option value="marketing">Marketing (Tamara)</option>
              <option value="production">Production (Camara, Jabari)</option>
              <option value="ticketing">Ticketing (Jess)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="bg-accent-hover text-bg-base uppercase tracking-wider font-bold text-sm px-5 py-2 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {adding ? "Sending…" : "Send invite"}
          </button>
        </form>
      </section>

      {/* Members table */}
      <section className="bg-bg-surface border border-border-crm rounded-xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-text-muted mb-4">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-text-muted text-sm">No members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted border-b border-border-crm">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2 pr-4">Last sign-in</th>
                <th className="py-2 pr-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const label = displayName(m);
                const isMe = myClerkId === m.clerkUserId;
                return (
                  <tr key={m._id} className="border-b border-border-crm">
                    <td className="py-2 pr-4 flex items-center gap-3">
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bg-card grid place-items-center text-xs text-text-muted">
                          {(m.firstName?.[0] ?? m.email[0]).toUpperCase()}
                        </div>
                      )}
                      <span className="text-text-primary">{label}</span>
                      {isMe && <span className="text-xs text-text-muted">(you)</span>}
                    </td>
                    <td className="py-2 pr-4 text-text-body">{m.email}</td>
                    <td className="py-2 pr-4">
                      <span className="text-xs uppercase tracking-widest text-accent-hover bg-accent/10 border border-accent/40 px-2 py-0.5 rounded">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-text-muted">{fmtDate(m.joinedAt)}</td>
                    <td className="py-2 pr-4 text-text-muted">{fmtRelative(m.lastSignInAt)}</td>
                    <td className="py-2 pr-4 text-right space-x-3">
                      {!isMe && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRevokeSessions(m.clerkUserId, label)}
                            className="text-text-muted hover:text-text-primary text-xs uppercase tracking-widest"
                          >
                            Sign out
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(m.clerkUserId, label)}
                            className="text-danger hover:text-red-300 text-xs uppercase tracking-widest"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Pending invites */}
      {pending.length > 0 && (
        <section className="bg-bg-surface border border-border-crm rounded-xl p-6">
          <h2 className="text-sm uppercase tracking-widest text-text-muted mb-4">
            Pending invites ({pending.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted border-b border-border-crm">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Invited by</th>
                <th className="py-2 pr-4">Sent</th>
                <th className="py-2 pr-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((inv) => (
                <tr key={inv._id} className="border-b border-border-crm">
                  <td className="py-2 pr-4 text-text-primary">{inv.email}</td>
                  <td className="py-2 pr-4 text-text-muted">{inv.invitedBy}</td>
                  <td className="py-2 pr-4 text-text-muted">{fmtRelative(inv.invitedAt)}</td>
                  <td className="py-2 pr-4 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleResendInvite(inv.clerkInvitationId, inv.email)}
                      className="text-text-muted hover:text-text-primary text-xs uppercase tracking-widest"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.clerkInvitationId, inv.email)}
                      className="text-danger hover:text-red-300 text-xs uppercase tracking-widest"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
