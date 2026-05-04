import Link from "next/link";

type NavLeaf = { label: string; href: string; disabled?: boolean };
type NavGroup = { label: string; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Events",
    children: [
      { label: "External Bookings", href: "/events/external-bookings" },
      { label: "Internal Shows", href: "/events/internal-shows" },
      { label: "Team Diary", href: "/events/team-diary", disabled: true },
      { label: "Calendar", href: "/events/calendar" },
    ],
  },
  { label: "Marketing", href: "/marketing", disabled: true },
  {
    label: "Music",
    children: [
      { label: "Songs", href: "/music/songs" },
      { label: "Setlists", href: "/music/setlists" },
      { label: "Demos", href: "/music/demos", disabled: true }, // T5 will enable
    ],
  },
  { label: "Finance", href: "/finance", disabled: true },
  { label: "Enhancers", href: "/enhancers-admin", disabled: true },
  { label: "Settings", href: "/settings", disabled: true },
];

export function Sidebar() {
  return (
    <nav className="w-56 border-r border-border-crm bg-bg-surface p-4">
      <ul className="space-y-1">
        {NAV.map((item) => (
          <li key={item.label}>
            {"children" in item ? (
              <div>
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-muted">{item.label}</div>
                <ul className="ml-3 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      {child.disabled ? (
                        <span
                          aria-disabled="true"
                          className="block px-3 py-1.5 rounded text-sm text-text-muted opacity-50 cursor-not-allowed"
                        >
                          {child.label}
                        </span>
                      ) : (
                        <Link
                          href={child.href}
                          className="block px-3 py-1.5 rounded text-sm text-text-body hover:bg-bg-card hover:text-text-primary"
                        >
                          {child.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : item.disabled ? (
              <span
                aria-disabled="true"
                className="block px-3 py-2 rounded text-sm text-text-muted opacity-50 cursor-not-allowed"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="block px-3 py-2 rounded text-sm text-text-body hover:bg-bg-card hover:text-text-primary"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
