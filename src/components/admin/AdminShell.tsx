import { UserButton } from "@clerk/nextjs";
import AdminNav from "./AdminNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary grid grid-cols-[260px_1fr]">
      <aside className="border-r border-border-crm p-6 flex flex-col">
        <div className="mb-8">
          <p
            className="text-xs uppercase tracking-[0.2em] text-accent"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            LME
          </p>
          <p
            className="font-bold text-lg"
            style={{ fontFamily: "var(--font-bebas-neue)" }}
          >
            Admin
          </p>
        </div>
        <AdminNav />
        <div className="mt-12 pt-8 border-t border-border-crm">
          <UserButton />
        </div>
      </aside>
      <main className="p-8 min-w-0">{children}</main>
    </div>
  );
}
