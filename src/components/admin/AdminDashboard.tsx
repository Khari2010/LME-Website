import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-crm p-6">
      <p className="text-xs uppercase tracking-widest text-text-muted">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const stats = await fetchQuery(api.contacts.getEnhancersDashboardStats, {});
  const recent = await fetchQuery(api.contacts.getRecentSignups, { limit: 10 });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-accent">Overview</p>
        <h1 className="text-3xl font-bold mt-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard label="Total Enhancers" value={stats.total} />
        <StatCard label="Last 7 days" value={stats.last7} />
        <StatCard label="Last 30 days" value={stats.last30} />
      </div>

      <section>
        <h2 className="text-lg font-bold mb-3">Recent signups</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted border-b border-border-crm">
            <tr>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((c) => (
              <tr key={c._id} className="border-b border-border-crm">
                <td className="py-2 pr-4">{c.email}</td>
                <td className="py-2 pr-4 text-text-muted">{c.status}</td>
                <td className="py-2 pr-4 text-text-muted">
                  {new Date(c.signupDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td className="py-4 text-text-muted" colSpan={3}>No signups yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
