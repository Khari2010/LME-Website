"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/role-permissions";
import { filterNavByRole } from "./sidebar-nav";

/**
 * Hamburger trigger + slide-over drawer for the CRM nav on mobile (< md).
 *
 * - Hidden at md+ via Tailwind responsive classes (the desktop {@link Sidebar}
 *   takes over there).
 * - When closed, the drawer DOM is unmounted entirely — no hidden div with
 *   negative offsets eating paint cycles.
 * - Auto-closes when the route changes so navigation feels native.
 */
export function MobileSidebarTrigger({ role }: { role: Role | "no-access" }) {
  const [open, setOpen] = useState(false);
  const items = filterNavByRole(role);
  const pathname = usePathname();

  // Close on route change (covers both link clicks and back/forward nav).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  const linkBase = "block px-3 py-2 rounded text-sm transition-colors";
  const childBase = "block px-3 py-1.5 rounded text-sm transition-colors";
  const activeStyles = "bg-bg-card text-text-primary font-semibold";
  const inactiveStyles = "text-text-body hover:bg-bg-card hover:text-text-primary";
  const disabledStyles = "text-text-muted opacity-50 cursor-not-allowed";

  // Lock body scroll while the drawer is open so the page underneath doesn't
  // wobble when the user scrolls inside the drawer.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -ml-2 text-text-body hover:text-text-primary"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-bg-surface border-r border-border-crm overflow-y-auto p-4"
            aria-label="Main menu"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-text-primary">LME · CRM</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-text-body hover:text-text-primary"
                aria-label="Close menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
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
                          onClick={() => setOpen(false)}
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
                                  onClick={() => setOpen(false)}
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
        </div>
      )}
    </>
  );
}
