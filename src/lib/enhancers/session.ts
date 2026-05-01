import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "enh_session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days

function getSecret(): Uint8Array {
  const raw = process.env.ENHANCERS_SESSION_SECRET;
  if (!raw) throw new Error("ENHANCERS_SESSION_SECRET not set");
  const bytes = new TextEncoder().encode(raw);
  if (bytes.length < 32) {
    throw new Error("ENHANCERS_SESSION_SECRET must be at least 32 bytes");
  }
  return bytes;
}

export async function signSession(
  contactId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return await new SignJWT({ sub: contactId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });
  if (typeof payload.sub !== "string") {
    throw new Error("Invalid session payload");
  }
  return payload.sub;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = DEFAULT_TTL_SECONDS;
