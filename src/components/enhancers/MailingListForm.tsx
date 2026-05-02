"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function MailingListForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupOrLogin = useMutation(api.contacts.signupOrLogin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signupOrLogin({ email });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-teal-400 uppercase tracking-widest text-sm">You&apos;re on the list</p>
        <p className="text-white mt-2 text-lg">Check {email} for your welcome email.</p>
        <p className="text-gray-500 text-sm mt-4">
          We&apos;ll be in touch with gig dates, new music, and Enhancer-only drops.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label htmlFor="ml-email" className="sr-only">
        Email
      </label>
      <input
        id="ml-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full bg-black border border-gray-700 text-white px-4 py-4 rounded text-base focus:outline-none focus:border-teal-400"
      />
      <button
        type="submit"
        disabled={submitting || !email}
        className="w-full bg-teal-400 text-black px-6 py-4 rounded font-bold uppercase tracking-wider text-sm hover:bg-teal-300 disabled:opacity-50 transition"
      >
        {submitting ? "Subscribing…" : "Subscribe"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
