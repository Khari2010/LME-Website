import { ReactNode } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { Sidebar } from "@/components/crm/Sidebar";
import { ThemeToggle } from "@/components/crm/ThemeToggle";
import { isAppHost } from "@/lib/host";
import { THEME_COOKIE, resolveInitialTheme, type Theme } from "@/lib/theme";
import type { Role } from "@/lib/role-permissions";
import { api } from "@convex/_generated/api";

export default async function AppDomainLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  if (!isAppHost(h.get("host"))) notFound();

  const c = await cookies();
  const cookieTheme = c.get(THEME_COOKIE)?.value as Theme | undefined;
  const theme = resolveInitialTheme({ cookie: cookieTheme ?? null, systemPrefersDark: false });

  // Auth routes (sign-in / sign-up) skip the CRM sidebar shell. The proxy
  // sets x-pathname for app-host requests so we can detect them here.
  const path = h.get("x-pathname") ?? "";
  const isAuthRoute = path.startsWith("/sign-in") || path.startsWith("/sign-up");

  if (isAuthRoute) {
    return (
      <div data-theme={theme} className="min-h-screen bg-bg-base text-text-body">
        {children}
      </div>
    );
  }

  // Resolve the signed-in user's role server-side and hand it to the Sidebar.
  // If the Convex users row doesn't exist yet (Clerk webhook hasn't fired), we
  // fall back to "no-access" — the Sidebar then only shows the Dashboard.
  const { userId } = await auth();
  let role: Role | "no-access" = "no-access";
  if (userId) {
    try {
      const user = await fetchQuery(api.users.getByClerkId, { clerkUserId: userId });
      role = (user?.role as Role | undefined) ?? "no-access";
    } catch {
      role = "no-access";
    }
  }

  return (
    <div data-theme={theme} className="min-h-screen bg-bg-base text-text-body flex">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border-crm flex items-center justify-between px-6">
          <Link href="/dashboard" className="font-bold text-text-primary">LME · CRM</Link>
          <ThemeToggle initialTheme={theme} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
