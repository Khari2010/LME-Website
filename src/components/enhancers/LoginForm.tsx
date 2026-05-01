"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function LoginForm() {
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
        <p className="text-teal-400 uppercase tracking-widest text-sm">Check your inbox</p>
        <p className="text-white mt-2">A new link is on its way to {email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label htmlFor="enh-login-email" className="block text-sm text-gray-400 uppercase tracking-widest">
        Email
      </label>
      <input
        id="enh-login-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full bg-black border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-teal-400"
      />
      <button
        type="submit"
        disabled={submitting || !email}
        className="w-full bg-teal-400 text-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-teal-300 disabled:opacity-50 transition"
      >
        {submitting ? "Sending…" : "Send me a link"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
