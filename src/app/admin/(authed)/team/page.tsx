"use client";

import {
  OrganizationProfile,
  CreateOrganization,
  useOrganization,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function TeamPage() {
  const { organization, isLoaded } = useOrganization();

  return (
    <div className="space-y-6 text-white">
      <header>
        <p className="text-xs uppercase tracking-widest text-teal-400">
          LME · Admin
        </p>
        <h1 className="text-3xl font-bold mt-1">Team</h1>
        <p className="text-gray-500 text-sm mt-1">
          Invite band members and manage who has admin access.
        </p>
      </header>

      {!isLoaded ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : !organization ? (
        <div className="space-y-4">
          <p className="text-gray-400">
            Create your team workspace — invite Chris and the rest of the band
            once it&apos;s set up.
          </p>
          <CreateOrganization
            appearance={{
              baseTheme: dark,
              variables: { colorPrimary: "#14b8a6" },
            }}
          />
        </div>
      ) : (
        <OrganizationProfile
          appearance={{
            baseTheme: dark,
            variables: { colorPrimary: "#14b8a6" },
          }}
        />
      )}
    </div>
  );
}
