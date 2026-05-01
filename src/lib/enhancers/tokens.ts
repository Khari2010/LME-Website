import { randomUUID } from "crypto";

export const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateMagicToken(): string {
  return randomUUID();
}

export function isTokenExpired(issuedAtMs: number, now: number = Date.now()): boolean {
  return now - issuedAtMs >= MAGIC_LINK_TTL_MS;
}
