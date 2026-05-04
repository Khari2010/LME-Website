import Link from "next/link";
import { canSeeModule, type Module, type Role } from "@/lib/role-permissions";

type NavLeaf = {
  label: string;
  href: string;
  disabled?: boolean;
  /** "always" = visible whenever the parent group has any visible child. */
  module: Module | "always";
};
type NavGroup = {
  label: string;
  children: NavLeaf[];
};
type NavItem = (NavLeaf & { kind: "leaf" }) | (NavGroup & { kind: "group" });

const NAV: NavItem[] = [
  { kind: "leaf", label: "Dashboard", href: "/dashboard", module: "dashboard" },
  {
    kind: "group",
    label: "Events",
    children: [
      {
        label: "External Bookings",
        href: "/events/external-bookings",
        module: "external-bookings",
      },
      {
        label: "Internal Shows",
        href: "/events/internal-shows",
        module: "internal-shows",
      },
      { label: "Team Diary", href: "/events/team-diary", module: "team-diary" },
      // Calendar is visible to anyone who can see ANY event family.
      { label: "Calendar", href: "/events/calendar", module: "always" },
    ],
  },
  { kind: "leaf", label: "Marketing", href: "/marketing", disabled: true, module: "marketing" },
  {
    kind: "group",
    label: "Music",
    children: [
      { label: "Songs", href: "/music/songs", module: "music" },
      { label: "Setlists", href: "/music/setlists", module: "music" },
      { label: "Demos", href: "/music/demos", module: "music" },
    ],
  },
  { kind: "leaf", label: "Finance", href: "/finance", module: "finance" },
  {
    kind: "leaf",
    label: "Enhancers",
    href: "/enhancers-admin",
    disabled: true,
    module: "enhancers",
  },
  { kind: "leaf", label: "Settings", href: "/settings", disabled: true, module: "settings" },
];

const EVENT_MODULES: ReadonlyArray<Module> = [
  "external-bookings",
  "internal-shows",
  "team-diary",
];

function isLeafVisible(role: Role | "no-access", leaf: NavLeaf, parentVisible: boolean): boolean {
  if (leaf.module === "always") return parentVisible;
  return canSeeModule(role, leaf.module);
}

export function Sidebar({ role }: { role: Role | "no-access" }) {
  return (
    <nav className="w-56 border-r border-border-crm bg-bg-surface p-4">
      <ul className="space-y-1">
        {NAV.map((item) => {
          if (item.kind === "leaf") {
            // For leaf items, "always" only makes sense in groups, but be safe:
            const visible = item.module === "always" ? true : canSeeModule(role, item.module);
            if (!visible) return null;
            return (
              <li key={item.label}>
                {item.disabled ? (
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
            );
          }

          // Group: filter children. For the Events group, "Calendar" stays
          // visible if any event family is visible.
          const eventGroupHasAnyVisible =
            item.label === "Events"
              ? EVENT_MODULES.some((m) => canSeeModule(role, m))
              : true;

          const visibleChildren = item.children.filter((child) =>
            isLeafVisible(role, child, eventGroupHasAnyVisible),
          );
          if (visibleChildren.length === 0) return null;

          return (
            <li key={item.label}>
              <div>
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-muted">
                  {item.label}
                </div>
                <ul className="ml-3 space-y-1">
                  {visibleChildren.map((child) => (
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
