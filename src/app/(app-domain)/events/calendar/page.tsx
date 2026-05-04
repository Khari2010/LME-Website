import { CalendarView } from "@/components/crm/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
      <CalendarView />
    </div>
  );
}
