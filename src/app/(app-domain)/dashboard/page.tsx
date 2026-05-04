import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = await getToken({ template: "convex" });
  const user = await fetchQuery(
    api.users.getByClerkId,
    { clerkUserId: userId },
    token ? { token } : {},
  );
  const role = user?.role ?? "no-access";

  return <DashboardClient role={role} />;
}
