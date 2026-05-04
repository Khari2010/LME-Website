import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export async function POST(req: NextRequest) {
  if (!CONVEX_URL) {
    return NextResponse.json({ error: "Convex URL missing" }, { status: 500 });
  }

  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = (await verifyWebhook(req)) as unknown as { type: string; data: Record<string, unknown> };
  } catch (err) {
    console.error("[clerk webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(CONVEX_URL);

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const u = evt.data as {
          id: string;
          email_addresses: { email_address: string; id: string }[];
          primary_email_address_id: string | null;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
          created_at: number;
        };
        const primaryEmail =
          u.email_addresses.find((e) => e.id === u.primary_email_address_id)?.email_address ??
          u.email_addresses[0]?.email_address;
        if (!primaryEmail) break;
        // P5-T4: read the role from a pending invitation if there is one;
        // otherwise default to "admin" (the historical behavior).
        const KNOWN_ROLES = new Set([
          "director", "admin", "internal-events", "marketing",
          "production", "ticketing", "owner", "drafter",
        ]);
        type Role = "director" | "admin" | "internal-events" | "marketing" | "production" | "ticketing" | "owner" | "drafter";
        let role: Role = "admin";
        if (evt.type === "user.created") {
          try {
            const invitedRole = await convex.query(api.invitations.getPendingRoleForEmail, {
              email: primaryEmail,
            });
            if (invitedRole && KNOWN_ROLES.has(invitedRole)) role = invitedRole as Role;
          } catch (err) {
            console.warn("[clerk webhook] failed to look up invitation role", err);
          }
        }
        await convex.mutation(api.users.upsertUser, {
          clerkUserId: u.id,
          email: primaryEmail.toLowerCase(),
          firstName: u.first_name ?? undefined,
          lastName: u.last_name ?? undefined,
          imageUrl: u.image_url ?? undefined,
          role,
          joinedAt: u.created_at,
        });
        if (evt.type === "user.created") {
          await convex.mutation(api.invitations.markAcceptedByEmail, {
            email: primaryEmail,
            at: Date.now(),
          });
        }
        break;
      }
      case "user.deleted": {
        const u = evt.data as { id: string };
        await convex.mutation(api.users.deleteUserByClerkId, { clerkUserId: u.id });
        break;
      }
      case "session.created": {
        const s = evt.data as { user_id: string; created_at: number };
        await convex.mutation(api.users.patchLastSignIn, {
          clerkUserId: s.user_id,
          at: s.created_at,
        });
        break;
      }
      default:
        // Ignore other events
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clerk webhook] processing error", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
