"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <p className="text-gray-400 text-sm">Signing you in…</p>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/admin"
        signUpForceRedirectUrl="/admin"
      />
    </div>
  );
}
