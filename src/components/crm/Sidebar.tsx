import Link from "next/link";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Events",
    children: [
      { label: "External Bookings", href: "/events/external-bookings" },
      { label: "Internal Shows", href: "/events/internal-shows", disabled: true },
      { label: "Team Diary", href: "/events/team-diary", disabled: true },
      { label: "Calendar", href: "/events/calendar" },
    ],
  },
  { label: "Marketing", href: "/marketing", disabled: true },
  { label: "Music", href: "/music", disabled: true },
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
            {"href" in item && item.href ? (
              <Link
                href={item.href}
                aria-disabled={item.disabled}
                className={`block px-3 py-2 rounded text-sm ${
                  item.disabled
                    ? "text-text-muted pointer-events-none opacity-50"
                    : "text-text-body hover:bg-bg-card hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <div>
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-muted">{item.label}</div>
                <ul className="ml-3 space-y-1">
                  {item.children?.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        aria-disabled={child.disabled}
                        className={`block px-3 py-1.5 rounded text-sm ${
                          child.disabled
                            ? "text-text-muted pointer-events-none opacity-50"
                            : "text-text-body hover:bg-bg-card hover:text-text-primary"
                        }`}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
