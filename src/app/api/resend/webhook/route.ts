import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

// TODO(security): verify Resend webhook signature via SVIX headers
// (svix-id, svix-timestamp, svix-signature) once we set this up in production.
// For v0 we accept all and rely on the URL being non-guessable plus the
// campaign/messageId lookup as a coarse filter.

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

  let body: ResendEvent;
  try {
    body = (await req.json()) as ResendEvent;
  } catch {
    console.warn("[resend-webhook] invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageId = body.data?.email_id;
  const recipientEmail = Array.isArray(body.data?.to)
    ? body.data?.to[0]
    : undefined;
  if (!messageId || !recipientEmail) {
    console.warn("[resend-webhook] missing email_id or recipient", {
      type: body.type,
    });
    return NextResponse.json({ ok: true, ignored: "missing fields" });
  }

  const ourType = TYPE_MAP[body.type];
  if (!ourType) {
    console.warn("[resend-webhook] unknown event type", { type: body.type });
    return NextResponse.json({
      ok: true,
      ignored: `unknown type ${body.type}`,
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
      occurredAt: body.data.created_at
        ? new Date(body.data.created_at).getTime()
        : Date.now(),
      data: body.data,
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
