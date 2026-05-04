import { fetchQuery } from "@/lib/convex/server";
import { api } from "@convex/_generated/api";
import ContactsTable from "@/components/admin/ContactsTable";

export const metadata = { title: "LME Admin · Contacts" };

export default async function ContactsPage() {
  const contacts = await fetchQuery(api.contacts.listAllContacts, {});
  const total = contacts.length;
  const active = contacts.filter((c) => c.status === "active").length;
  const unsubscribed = contacts.filter((c) => c.status === "unsubscribed").length;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-mono">
            LME · Marketing
          </p>
          <h1
            className="text-4xl mt-1"
            style={{ fontFamily: "var(--font-bebas-neue)", letterSpacing: "0.04em" }}
          >
            Contacts
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {total.toLocaleString()} total · {active.toLocaleString()} active ·{" "}
            {unsubscribed.toLocaleString()} unsubscribed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-2 text-xs text-text-muted border border-border-crm rounded-md font-mono"
            title="Imports happen via the import-contacts.ts script for now"
          >
            CSV imports run via script
          </span>
        </div>
      </header>

      <ContactsTable contacts={contacts} />
    </div>
  );
}
