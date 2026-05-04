"use client";

import { ReactNode, useEffect } from "react";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function AuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      convex.setAuth(async ({ forceRefreshToken }) => {
        try {
          return await getToken({
            template: "convex",
            skipCache: forceRefreshToken,
          });
        } catch {
          return null;
        }
      });
    } else {
      convex.clearAuth();
    }
  }, [isLoaded, isSignedIn, getToken]);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthBridge>{children}</AuthBridge>
    </ConvexProvider>
  );
}
