import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Composer from "@/components/admin/Composer";

export const metadata = { title: "LME Admin · Compose" };

export default async function ComposePage() {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");

  return <Composer userId={userId} />;
}
