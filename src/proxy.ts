import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/enhancers/session";

// Normalize trailing slashes for path matching (next.config has trailingSlash: true).
function stripTrailingSlash(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = stripTrailingSlash(req.nextUrl.pathname);

  // Enhancers gate — gated content; public routes (login/auth/check-email/logout) bypass.
  const isEnhancersGated =
    path === "/enhancers" || path.startsWith("/enhancers/posts");

  if (isEnhancersGated) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) {
      return NextResponse.redirect(new URL("/enhancers/login/", req.url));
    }
    try {
      await verifySession(cookie);
    } catch {
      const res = NextResponse.redirect(new URL("/enhancers/login/", req.url));
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
      return NextResponse.redirect(new URL("/admin/sign-in/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on everything except static assets and API
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
