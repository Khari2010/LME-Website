import { canSeeModule, type Module, type Role } from "@/lib/role-permissions";

// Shared NAV definition + role-based filter, used by both the desktop
// {@link Sidebar} (server component) and the mobile {@link MobileSidebarTrigger}
// (client component) so the menu structure stays in sync across breakpoints.

export type NavLeaf = {
  label: string;
  href: string;
  disabled?: boolean;
  /** "always" = visible whenever the parent group has any visible child. */
  module: Module | "always";
};
export type NavGroup = {
  label: string;
  children: NavLeaf[];
};
export type NavItem = (NavLeaf & { kind: "leaf" }) | (NavGroup & { kind: "group" });

export const NAV: NavItem[] = [
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
  {
    kind: "group",
    label: "Marketing",
    children: [
      { label: "Overview", href: "/marketing", module: "marketing" },
      { label: "Compose", href: "/marketing/compose", module: "marketing" },
      { label: "Campaigns", href: "/marketing/campaigns", module: "marketing" },
      { label: "Contacts", href: "/marketing/contacts", module: "marketing" },
      { label: "Content Planner", href: "/marketing/content-planner", module: "marketing" },
    ],
  },
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
  {
    kind: "group",
    label: "Settings",
    children: [
      { label: "Overview", href: "/settings", module: "settings" },
      { label: "Team", href: "/settings/team", module: "settings" },
    ],
  },
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

/**
 * Filter the NAV tree against a role, dropping any leaf or group the role
 * can't see. Returns groups with a pre-filtered `children` array, so callers
 * can render straight from the result.
 */
export function filterNavByRole(role: Role | "no-access"): NavItem[] {
  return NAV.flatMap((item): NavItem[] => {
    if (item.kind === "leaf") {
      const visible = item.module === "always" ? true : canSeeModule(role, item.module);
      return visible ? [item] : [];
    }

    // Group: filter children. For the Events group, "Calendar" stays visible
    // if any event family is visible.
    const eventGroupHasAnyVisible =
      item.label === "Events"
        ? EVENT_MODULES.some((m) => canSeeModule(role, m))
        : true;

    const visibleChildren = item.children.filter((child) =>
      isLeafVisible(role, child, eventGroupHasAnyVisible),
    );
    if (visibleChildren.length === 0) return [];
    return [{ ...item, children: visibleChildren }];
  });
}
