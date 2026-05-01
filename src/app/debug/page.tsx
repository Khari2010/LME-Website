import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const a = await auth();
  const user = await currentUser().catch((e) => ({ _error: String(e) }));
  const c = await cookies();
  const h = await headers();
  const cookieNames = c.getAll().map((x) => x.name);
  const host = h.get("host");

  return (
    <main className="min-h-screen bg-black text-white p-8 font-mono text-sm">
      <h1 className="text-2xl mb-4">Auth debug</h1>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(
          {
            host,
            "auth().userId": a.userId,
            "auth().sessionId": a.sessionId,
            "auth().orgId": a.orgId,
            currentUser: user
              ? "_error" in user
                ? user
                : { id: (user as { id: string }).id }
              : null,
            cookieNames,
            hasClerkSession: cookieNames.includes("__session"),
            hasClerkClientUat: cookieNames.includes("__client_uat"),
          },
          null,
          2,
        )}
      </pre>
      <p className="mt-6 text-gray-400">
        If <code>auth().userId</code> is null but you see <code>__session</code> in
        cookies, the session token isn&apos;t verifying. Check Clerk publishable
        key and JWT template config.
      </p>
    </main>
  );
}
