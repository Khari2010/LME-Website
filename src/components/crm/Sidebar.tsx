import Link from "next/link";
import type { Role } from "@/lib/role-permissions";
import { filterNavByRole } from "./sidebar-nav";

/**
 * Desktop sidebar — server component, renders nothing on mobile (hamburger
 * drawer takes over via {@link MobileSidebarTrigger}).
 */
export function Sidebar({
  role,
  pathname,
}: {
  role: Role | "no-access";
  pathname: string;
}) {
  const items = filterNavByRole(role);

  function isActive(href: string): boolean {
    return pathname === href;
  }

  const linkBase = "block px-3 py-2 rounded text-sm transition-colors";
  const childBase = "block px-3 py-1.5 rounded text-sm transition-colors";
  const activeStyles = "bg-bg-card text-text-primary font-semibold";
  const inactiveStyles = "text-text-body hover:bg-bg-card hover:text-text-primary";
  const disabledStyles = "text-text-muted opacity-50 cursor-not-allowed";

  return (
    <nav className="hidden md:block w-56 border-r border-border-crm bg-bg-surface p-4">
      <ul className="space-y-1">
        {items.map((item) => {
          if (item.kind === "leaf") {
            const active = !item.disabled && isActive(item.href);
            return (
              <li key={item.label}>
                {item.disabled ? (
                  <span aria-disabled="true" className={`${linkBase} ${disabledStyles}`}>
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${linkBase} ${active ? activeStyles : inactiveStyles}`}
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
                  {item.children.map((child) => {
                    const active = !child.disabled && isActive(child.href);
                    return (
                      <li key={child.label}>
                        {child.disabled ? (
                          <span aria-disabled="true" className={`${childBase} ${disabledStyles}`}>
                            {child.label}
                          </span>
                        ) : (
                          <Link
                            href={child.href}
                            aria-current={active ? "page" : undefined}
                            className={`${childBase} ${active ? activeStyles : inactiveStyles}`}
                          >
                            {child.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
