import { redirect } from "next/navigation";

export default function EventsIndex() {
  redirect("/events/external-bookings");
}
