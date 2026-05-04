import Link from "next/link";

export const metadata = { title: "LME · Settings" };

const TILES: { href: string; label: string; description: string }[] = [
  {
    href: "/settings/team",
    label: "Team",
    description: "Invite team members, set roles, manage access.",
  },
  {
    href: "/settings/site-copy",
    label: "Site Copy",
    description: "Edit public-site copy without a code deploy.",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Workspace configuration.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block p-5 rounded-lg border border-border-crm bg-bg-surface hover:bg-bg-card transition-colors"
          >
            <h2 className="text-base font-semibold text-text-primary">{t.label}</h2>
            <p className="text-sm text-text-muted mt-1">{t.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
