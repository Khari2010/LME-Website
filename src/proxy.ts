import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/enhancers/session";
import { isAppHost } from "@/lib/host";

// Normalize trailing slashes for path matching (next.config has trailingSlash: true).
function stripTrailingSlash(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

// NOTE: This proxy isn't unit-tested directly — it depends on Clerk + Next request
// shapes that are awkward to fake. Hostname-routing smoke is covered manually once
// the (app-domain) route group lands in Task 6.
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = stripTrailingSlash(req.nextUrl.pathname);
  const host = req.headers.get("host");

  // ===== App hostname (app.lmeband.com) =====
  // Clerk-gated CRM. Only /sign-in and /sign-up are public.
  if (isAppHost(host)) {
    const isAuthRoute =
      path.startsWith("/sign-in") || path.startsWith("/sign-up");

    if (!isAuthRoute) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
    }
    return NextResponse.next();
  }

  // ===== Public hostname (lmeband.com / www.lmeband.com / dev) =====
  // Existing /enhancers and /admin gates retained verbatim.

  // Enhancers gate — gated content; public routes (login/auth/check-email/logout) bypass.
  const isEnhancersGated =
    path === "/enhancers" || path.startsWith("/enhancers/posts");

  if (isEnhancersGated) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) {
      return NextResponse.redirect(new URL("/enhancers/login", req.url));
    }
    try {
      await verifySession(cookie);
    } catch {
      const res = NextResponse.redirect(new URL("/enhancers/login", req.url));
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
  }

  // Admin gate — everything under /admin except /admin/sign-in/* requires Clerk auth.
  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  const isAdminPublic =
    path === "/admin/sign-in" || path.startsWith("/admin/sign-in/");

  if (isAdmin && !isAdminPublic) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/sign-in", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Clerk's recommended matcher — excludes Next internals + static files,
    // explicitly includes API routes so middleware/auth runs on them.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
