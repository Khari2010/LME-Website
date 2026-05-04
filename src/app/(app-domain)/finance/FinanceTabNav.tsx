"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Cashflow", href: "/finance/cashflow" },
  { label: "Invoices", href: "/finance/invoices" },
  { label: "Expenses", href: "/finance/expenses" },
  { label: "Contracts", href: "/finance/contracts" },
];

export function FinanceTabNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-border-crm -mb-4">
      {TABS.map((t) => {
        const active = pathname?.startsWith(t.href) ?? false;
        return (
          <Link
            key={t.href}
            href={t.href}
            data-active={active}
            className="px-3 py-2 text-sm border-b-2 border-transparent text-text-muted hover:text-text-body data-[active=true]:border-accent data-[active=true]:text-text-primary"
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
