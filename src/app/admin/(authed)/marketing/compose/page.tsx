import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Composer from "@/components/admin/Composer";
import type { Id } from "@convex/_generated/dataModel";

export const metadata = { title: "LME Admin · Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");

  const { draft } = await searchParams;
  return (
    <Composer
      userId={userId}
      draftId={draft ? (draft as Id<"campaigns">) : undefined}
    />
  );
}
