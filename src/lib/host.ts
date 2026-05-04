// All hostnames that route to the admin app shell. Includes future-proofing
// for alternative domains (per spec §13) so adding a new TLD doesn't silently
// fall through to public-site behaviour.
const APP_HOSTNAMES = new Set([
  "app.lmeband.com",
  "app.lme.band",
  "lmeband.app",
]);
const PUBLIC_HOSTNAMES = new Set([
  "lmeband.com",
  "www.lmeband.com",
  "lme.band",
  "www.lme.band",
]);

function stripPort(host: string): string {
  return host.split(":")[0];
}

export function isAppHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = stripPort(host);
  if (APP_HOSTNAMES.has(bare)) return true;
  if (
    process.env.NEXT_PUBLIC_LOCAL_APP_HOST &&
    stripPort(process.env.NEXT_PUBLIC_LOCAL_APP_HOST) === bare
  ) {
    return true;
  }
  return false;
}

export function isPublicHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = stripPort(host);
  return PUBLIC_HOSTNAMES.has(bare);
}
