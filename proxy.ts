import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/enhancers/session";

const isEnhancersGate = createRouteMatcher([
  "/enhancers",
  "/enhancers/posts/(.*)",
]);

const isAdminGate = createRouteMatcher(["/admin", "/admin/(.*)"]);
const isAdminPublic = createRouteMatcher(["/admin/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Enhancers gate
  if (isEnhancersGate(req)) {
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

  // Admin gate
  if (isAdminGate(req) && !isAdminPublic(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/sign-in", req.url));
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
