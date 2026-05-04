import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { Webhook } from "svix";
import { api } from "@convex/_generated/api";

// P7 bug-hunt fix: Resend webhooks are signed using Svix (same as Clerk).
// Without verification, anyone with the URL could forge bounces / complaints
// and corrupt our suppression list. We verify the signature using the
// `svix` package and `RESEND_WEBHOOK_SECRET` env var (set in Resend's
// webhook config UI; rotate via the dashboard).
//
// IMPORTANT: deploy notes must include `RESEND_WEBHOOK_SECRET` — when missing
// the route returns 500 so the webhook delivery surface is fail-closed.

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

type ResendEvent = {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    created_at?: string;
    [k: string]: unknown;
  };
};

const TYPE_MAP: Record<
  string,
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "delivery_delayed"
> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
};

export async function POST(req: NextRequest) {
  if (!CONVEX_URL) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 },
    );
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend webhook] RESEND_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  // Read the raw body BEFORE any JSON parsing — Svix verifies the signature
  // against the byte-exact request body.
  const rawBody = await req.text();
  const headersObj = Object.fromEntries(req.headers.entries());

  let payload: ResendEvent;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, headersObj) as ResendEvent;
  } catch (err) {
    console.error("[resend webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const messageId = payload.data?.email_id;
  const recipientEmail = Array.isArray(payload.data?.to)
    ? payload.data?.to[0]
    : undefined;
  if (!messageId || !recipientEmail) {
    console.warn("[resend-webhook] missing email_id or recipient", {
      type: payload.type,
    });
    return NextResponse.json({ ok: true, ignored: "missing fields" });
  }

  const ourType = TYPE_MAP[payload.type];
  if (!ourType) {
    console.warn("[resend-webhook] unknown event type", { type: payload.type });
    return NextResponse.json({
      ok: true,
      ignored: `unknown type ${payload.type}`,
    });
  }

  try {
    const convex = new ConvexHttpClient(CONVEX_URL);
    const campaign = await convex.query(api.campaigns.findCampaignByMessageId, {
      resendMessageId: messageId,
    });
    if (!campaign) {
      console.info("[resend-webhook] no matching campaign for messageId", {
        messageId,
        type: ourType,
      });
      return NextResponse.json({ ok: true, ignored: "no matching campaign" });
    }

    await convex.mutation(api.campaigns.recordCampaignEvent, {
      campaignId: campaign._id,
      resendMessageId: messageId,
      recipientEmail,
      type: ourType,
      occurredAt: payload.data.created_at
        ? new Date(payload.data.created_at).getTime()
        : Date.now(),
      data: payload.data,
    });

    console.info("[resend-webhook] recorded event", {
      campaignId: campaign._id,
      type: ourType,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-webhook] failed to record event", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
