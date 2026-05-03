import { ReactNode } from "react";
import { EventDetailHeader } from "@/components/crm/EventDetailHeader";
import { Id } from "../../../../../convex/_generated/dataModel";

export default async function EventDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <EventDetailHeader id={id as Id<"events">} />
      {children}
    </div>
  );
}
