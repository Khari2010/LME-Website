"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const MARKETING_ITEMS: NavItem[] = [
  { href: "/admin/marketing", label: "Overview", exact: true },
  { href: "/admin/marketing/compose", label: "Compose" },
  { href: "/admin/marketing/campaigns", label: "Campaigns" },
  { href: "/admin/marketing/contacts", label: "Contacts" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname() ?? "";
  const dashboardActive = pathname === "/admin";
  const marketingExpanded = pathname.startsWith("/admin/marketing");

  return (
    <nav aria-label="Admin navigation" className="space-y-1 text-sm">
      <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-text-muted font-mono">
        Navigate
      </p>

      <Link
        href="/admin"
        className={`block px-3 py-2 rounded transition-colors ${
          dashboardActive
            ? "bg-bg-surface text-text-primary border border-border-crm"
            : "text-text-body hover:bg-bg-surface hover:text-text-primary"
        }`}
      >
        Dashboard
      </Link>

      <Link
        href="/admin/team"
        className={`block px-3 py-2 rounded transition-colors ${
          isActive(pathname, "/admin/team")
            ? "bg-bg-surface text-text-primary border border-border-crm"
            : "text-text-body hover:bg-bg-surface hover:text-text-primary"
        }`}
      >
        Team
      </Link>

      <Link
        href="/admin/site-copy"
        className={`block px-3 py-2 rounded transition-colors ${
          isActive(pathname, "/admin/site-copy")
            ? "bg-bg-surface text-text-primary border border-border-crm"
            : "text-text-body hover:bg-bg-surface hover:text-text-primary"
        }`}
      >
        Site copy
      </Link>

      <div className="pt-3">
        <p
          className={`px-3 pb-1 text-[10px] uppercase tracking-[0.2em] font-mono ${
            marketingExpanded ? "text-accent" : "text-text-muted"
          }`}
        >
          Marketing
        </p>
        <ul className="space-y-0.5">
          {MARKETING_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block pl-6 pr-3 py-1.5 rounded text-[13px] transition-colors ${
                    active
                      ? "text-accent bg-bg-surface border border-border-crm"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pt-4 space-y-0.5">
        <span
          className="block px-3 py-2 rounded text-gray-600 cursor-not-allowed"
          title="Coming in #2"
        >
          Bookings
          <span className="ml-2 text-[9px] uppercase tracking-widest text-gray-700">
            soon
          </span>
        </span>
        <span
          className="block px-3 py-2 rounded text-gray-600 cursor-not-allowed"
          title="Coming in #1b"
        >
          Library
          <span className="ml-2 text-[9px] uppercase tracking-widest text-gray-700">
            soon
          </span>
        </span>
        <span
          className="block px-3 py-2 rounded text-gray-600 cursor-not-allowed"
          title="Coming in #3"
        >
          Tasks
          <span className="ml-2 text-[9px] uppercase tracking-widest text-gray-700">
            soon
          </span>
        </span>
      </div>
    </nav>
  );
}
