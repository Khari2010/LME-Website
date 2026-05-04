import Link from "next/link";
import type { Role } from "@/lib/role-permissions";
import { filterNavByRole } from "./sidebar-nav";

/**
 * Desktop sidebar — server component, renders nothing on mobile (hamburger
 * drawer takes over via {@link MobileSidebarTrigger}).
 */
export function Sidebar({ role }: { role: Role | "no-access" }) {
  const items = filterNavByRole(role);

  return (
    <nav className="hidden md:block w-56 border-r border-border-crm bg-bg-surface p-4">
      <ul className="space-y-1">
        {items.map((item) => {
          if (item.kind === "leaf") {
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

          return (
            <li key={item.label}>
              <div>
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-text-muted">
                  {item.label}
                </div>
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
