import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  renderStandardContract,
  type ContractData,
} from "../src/lib/contracts/standard-template";

// ---------------------------------------------------------------------------
// contracts — server-side flows for the standard LME performance contract.
//
// `sendContract` is admin-triggered: it (1) reuses or mints a magic-link
// token, (2) stamps `event.contract` metadata + advances status to
// `ContractSent`, (3) schedules the Resend email containing the portal link.
// We mirror the in-line token minting pattern from `convex/bookingForm.ts`
// because Convex doesn't allow calling one mutation from another.
//
// `getContractData` is the public query the client portal uses to render the
// contract HTML. It re-validates the token (revoked / expired / unknown all
// surface as `null`) before returning anything sensitive.
//
// `signContract` is the public mutation invoked when the client types their
// name + checks "I agree". It sets `signedAt` + `signedByName`, appends to
// the audit log, and advances status to `ContractSigned`. We deliberately
// reject already-signed contracts so a re-submit doesn't overwrite the
// original signing record — the audit log is the source of truth.
// ---------------------------------------------------------------------------

// Default TTL for a fresh booking-portal token: 6 months. Mirrors
// `convex/bookingForm.ts` so contract + booking-form tokens have parity.
const DEFAULT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Slugify the client name for the human-readable portion of the portal URL.
// The token is what actually authorises access; the slug is purely cosmetic.
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "booking"
  );
}

// 64-hex-char token — same shape produced by `bookingForm.sendFullForm`.
function generateToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

export const sendContract = mutation({
  args: { id: v.id("events") },
  returns: v.object({ token: v.string(), portalUrl: v.string() }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("event not found");
    if (event.family !== "ExternalBooking") {
      throw new Error("only external bookings can have a contract");
    }
    if (!event.client?.email) {
      throw new Error("client email required");
    }
    if (!event.finance?.fee) {
      throw new Error(
        "fee required before sending contract — set it on the Finance & Legal tab",
      );
    }

    // Reuse a still-valid token for this event if one exists, else mint a
    // fresh one. Reusing means the booking-form link the client has already
    // bookmarked still works as a contract link too.
    const now = Date.now();
    const existing = await ctx.db
      .query("bookingTokens")
      .withIndex("by_event", (q) => q.eq("eventId", args.id))
      .collect();
    const validExisting = existing.find(
      (t) => t.revokedAt === undefined && t.expiresAt > now,
    );

    let token: string;
    if (validExisting) {
      token = validExisting.token;
    } else {
      token = generateToken();
      await ctx.db.insert("bookingTokens", {
        eventId: args.id,
        token,
        mintedAt: now,
        expiresAt: now + DEFAULT_TTL_MS,
      });
    }

    const slug = slugify(event.client.name || event.name);
    const portalUrl = `https://lmeband.com/c/${slug}/${token}/contract`;

    // Stamp contract metadata + advance status. We keep any pre-existing
    // contract fields (e.g. a templateId set by the admin) and append the
    // `contract_sent` audit-log entry rather than replacing the log.
    await ctx.db.patch(args.id, {
      status: "ContractSent",
      nextActionLabel: "Awaiting client signature",
      contract: {
        ...(event.contract ?? { auditLog: [] }),
        templateId: event.contract?.templateId ?? "standard",
        sentAt: now,
        auditLog: [
          ...(event.contract?.auditLog ?? []),
          { ts: now, action: "contract_sent" },
        ],
      },
    });

    // Send the email asynchronously — keeps the mutation fast and lets the
    // Node-runtime action handle Resend.
    await ctx.scheduler.runAfter(
      0,
      internal.contractsEmail.sendContractEmail,
      {
        to: event.client.email,
        clientName: event.client.name || "",
        portalUrl,
      },
    );

    return { token, portalUrl };
  },
});

export const getContractData = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      html: v.string(),
      signedAt: v.optional(v.number()),
      signedByName: v.optional(v.string()),
      eventId: v.id("events"),
    }),
  ),
  handler: async (ctx, args) => {
    const tokenRow = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!tokenRow) return null;
    if (tokenRow.revokedAt !== undefined) return null;
    if (tokenRow.expiresAt <= Date.now()) return null;

    const event = await ctx.db.get(tokenRow.eventId);
    // The portal can only render once the admin has actually sent the
    // contract — i.e. `contract.sentAt` is stamped. Without that we have
    // no `generatedAt` and the URL is effectively a leaked-token guard.
    if (!event || !event.contract?.sentAt) return null;
    if (!event.client || !event.finance?.fee) return null;

    const data: ContractData = {
      clientName: event.client.name || "",
      clientAddress: event.client.address,
      eventDate: formatDate(event.startDate),
      venue: event.venue?.name ?? "TBD",
      fee: event.finance.fee,
      depositAmount: event.finance.deposit?.amount ?? event.finance.fee * 0.5,
      balanceDueDate: event.finance.balance?.dueDate
        ? formatDate(event.finance.balance.dueDate)
        : "14 days before event date",
      bandConfig: event.bookingConfig?.bandConfig || "TBD",
      extras: event.bookingConfig?.extras ?? [],
      generatedAt: formatDate(event.contract.sentAt),
    };

    return {
      html: renderStandardContract(data),
      signedAt: event.contract.signedAt,
      signedByName: event.contract.signedByName,
      eventId: tokenRow.eventId,
    };
  },
});

export const signContract = mutation({
  args: {
    token: v.string(),
    signedByName: v.string(),
    // `ip` is reserved for a future Server Action that captures the request
    // IP server-side — don't accept it from untrusted client input here.
    ipAddress: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = args.signedByName.trim();
    if (!name) throw new Error("name required");

    const tokenRow = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!tokenRow) throw new Error("invalid link");
    if (tokenRow.revokedAt !== undefined) throw new Error("link revoked");
    if (tokenRow.expiresAt <= Date.now()) throw new Error("link expired");

    const event = await ctx.db.get(tokenRow.eventId);
    if (!event) throw new Error("event not found");
    if (!event.contract?.sentAt) throw new Error("contract not sent");
    // Reject re-signing — the audit log is the source of truth and we don't
    // want a second submission to clobber the original signing record.
    if (event.contract.signedAt !== undefined) {
      throw new Error("already signed");
    }

    const now = Date.now();
    await ctx.db.patch(tokenRow.eventId, {
      status: "ContractSigned",
      nextActionLabel: "Send deposit invoice",
      contract: {
        ...event.contract,
        signedAt: now,
        signedByName: name,
        auditLog: [
          ...(event.contract.auditLog ?? []),
          { ts: now, action: "contract_signed", ip: args.ipAddress },
        ],
      },
    });
    return null;
  },
});
