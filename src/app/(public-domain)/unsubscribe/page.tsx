import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export const metadata = { title: "Unsubscribe · LME Enhancers" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let result: { ok: boolean; email?: string; error?: string; test?: boolean } = {
    ok: false,
  };
  if (token === "test-preview") {
    result = { ok: false, test: true };
  } else if (token) {
    try {
      const r = await fetchMutation(api.contacts.unsubscribeByToken, { token });
      result = { ok: true, email: r.email };
    } catch (e) {
      result = {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  } else {
    result = { ok: false, error: "Missing unsubscribe token." };
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-teal-400 uppercase tracking-widest text-sm">
          LME · Enhancers
        </p>
        {result.ok ? (
          <>
            <h1 className="text-white text-3xl font-bold mt-2 mb-4">
              You&apos;re unsubscribed.
            </h1>
            <p className="text-gray-400">
              {result.email} won&apos;t receive any more emails from us. Sorry
              to see you go.
            </p>
          </>
        ) : result.test ? (
          <>
            <h1 className="text-white text-3xl font-bold mt-2 mb-4">
              Test email — unsubscribe disabled.
            </h1>
            <p className="text-gray-400">
              This was a test send. Real recipients each get a unique unsubscribe
              link tied to their contact record. Looks good — you&apos;re ready
              to broadcast.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-white text-3xl font-bold mt-2 mb-4">
              Couldn&apos;t unsubscribe.
            </h1>
            <p className="text-gray-400">
              {result.error ?? "Invalid or expired link."}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
