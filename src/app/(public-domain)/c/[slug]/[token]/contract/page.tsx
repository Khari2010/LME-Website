import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ContractSignClient } from "@/components/client-portal/ContractSignClient";

// Server component — fetches the rendered contract HTML for the magic-link
// token. `getContractData` already handles all token validation (revoked /
// expired / unknown / contract-not-yet-sent all surface as null), so we just
// branch on the result.
//
// The route lives one level deeper than the parent portal page, which means
// the relative imports take 7 `../` to reach `convex/_generated/api`.
//
// We deliberately don't use Cache Components / `use cache` here — contract
// state must always reflect the latest signed status, and the portal is
// hit infrequently enough that fresh-on-each-load is the right default.
export default async function ContractPortalPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;
  const data = await fetchQuery(api.contracts.getContractData, { token });

  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Contract not available</h1>
        <p className="text-sm text-[#8A8A8A]">
          This link is no longer valid, or the contract hasn&apos;t been sent
          yet. Contact{" "}
          <a href="mailto:admin@lmeband.com" className="underline">
            admin@lmeband.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <ContractSignClient
      token={token}
      html={data.html}
      signedAt={data.signedAt ?? null}
      signedByName={data.signedByName ?? null}
    />
  );
}
