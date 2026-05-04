/**
 * Centralised RBAC matrix for the LME CRM.
 *
 * The Sidebar uses {@link canSeeModule} to filter visible nav items.
 * Mutations should use {@link canWriteModule} (or the Convex-side
 * `requireWrite` helper in `convex/auth.ts`) to gate writes.
 *
 * Phase 5 simplification: read-side visibility is binary per module.
 * The "read vs full" distinction from the spec is enforced at the
 * mutation layer, not at the sidebar.
 */

export type Role =
  | "director"
  | "admin"
  | "internal-events"
  | "marketing"
  | "production"
  | "ticketing"
  // Legacy roles retained during migration:
  | "owner" // legacy — director-equivalent
  | "drafter"; // legacy — admin-equivalent

export type Module =
  | "dashboard"
  | "external-bookings"
  | "internal-shows"
  | "team-diary"
  | "marketing"
  | "music"
  | "finance"
  | "enhancers"
  | "settings";

const VISIBILITY: Record<Module, ReadonlyArray<Role>> = {
  "dashboard": [
    "director",
    "admin",
    "internal-events",
    "marketing",
    "production",
    "ticketing",
    "owner",
    "drafter",
  ],
  "external-bookings": ["director", "admin", "internal-events", "marketing", "owner", "drafter"],
  "internal-shows": [
    "director",
    "admin",
    "internal-events",
    "marketing",
    "production",
    "ticketing",
    "owner",
    "drafter",
  ],
  "team-diary": ["director", "admin", "internal-events", "marketing", "production", "owner", "drafter"],
  "marketing": ["director", "internal-events", "marketing", "owner"],
  "music": ["director", "admin", "internal-events", "marketing", "production", "owner", "drafter"],
  "finance": ["director", "admin", "owner"],
  "enhancers": ["director", "internal-events", "marketing", "owner"],
  "settings": [
    "director",
    "admin",
    "internal-events",
    "marketing",
    "production",
    "ticketing",
    "owner",
    "drafter",
  ],
};

export function canSeeModule(role: Role | undefined | "no-access", mod: Module): boolean {
  if (!role || role === "no-access") return mod === "dashboard"; // no-access only sees a degraded dashboard
  return (VISIBILITY[mod] as ReadonlyArray<string>).includes(role);
}

const WRITE_ALLOWED: Record<Module, ReadonlyArray<Role>> = {
  "dashboard": [],
  "external-bookings": ["director", "admin", "owner"],
  "internal-shows": ["director", "internal-events", "owner"],
  "team-diary": ["director", "internal-events", "owner"],
  "marketing": ["director", "marketing", "owner"],
  "music": ["director", "owner"],
  "finance": ["director", "owner"],
  "enhancers": ["director", "marketing", "owner"],
  "settings": ["director", "owner"],
};

export function canWriteModule(role: Role | undefined | "no-access", mod: Module): boolean {
  if (!role || role === "no-access") return false;
  return (WRITE_ALLOWED[mod] as ReadonlyArray<string>).includes(role);
}

/** Map a role to a friendly display label. */
export function roleLabel(role: Role | "no-access"): string {
  switch (role) {
    case "director":
      return "Director";
    case "admin":
      return "Admin";
    case "internal-events":
      return "Internal Events";
    case "marketing":
      return "Marketing";
    case "production":
      return "Production";
    case "ticketing":
      return "Ticketing";
    case "owner":
      return "Director (legacy)";
    case "drafter":
      return "Drafter (legacy)";
    case "no-access":
      return "Pending setup";
  }
}
