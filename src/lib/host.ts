const APP_HOSTNAMES = new Set(["app.lmeband.com"]);
const PUBLIC_HOSTNAMES = new Set(["lmeband.com", "www.lmeband.com"]);

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
