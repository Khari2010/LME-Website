import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/enhancers/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/enhancers/login?error=missing", req.url));
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let contactId: string;
  try {
    const result = await convex.mutation(api.contacts.redeemMagicLink, { token });
    contactId = result.contactId;
  } catch {
    return NextResponse.redirect(new URL("/enhancers/login?error=invalid", req.url));
  }

  const cookie = await signSession(contactId);
  const response = NextResponse.redirect(new URL("/enhancers", req.url));
  response.cookies.set(SESSION_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
