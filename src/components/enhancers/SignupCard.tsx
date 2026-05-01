"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface Props {
  variant?: "hero" | "footer";
}

export default function SignupCard({ variant = "hero" }: Props) {
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
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={variant === "hero" ? "py-8" : "py-12"}>
        <p className="text-teal-400 text-sm uppercase tracking-widest">Check your inbox</p>
        <p className="text-white mt-2">We just sent you a link to unlock the Enhancers area.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={variant === "hero" ? "py-6" : "py-12"}>
      <p className="text-teal-400 text-xs uppercase tracking-widest mb-3">
        Become an Enhancer
      </p>
      <h3 className="text-white text-2xl md:text-3xl font-bold mb-4">
        Exclusive content. Straight to your inbox.
      </h3>
      <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <label htmlFor={`enh-email-${variant}`} className="sr-only">Email</label>
        <input
          id={`enh-email-${variant}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-black border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-teal-400"
        />
        <button
          type="submit"
          disabled={submitting || !email}
          className="bg-teal-400 text-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-teal-300 disabled:opacity-50 transition"
        >
          {submitting ? "Sending…" : "Sign me up"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </form>
  );
}
