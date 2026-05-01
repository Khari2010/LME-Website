import { UserButton } from "@clerk/nextjs";
import AdminNav from "./AdminNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white grid grid-cols-[260px_1fr]">
      <aside className="border-r border-[#1f1f1f] p-6 flex flex-col">
        <div className="mb-8">
          <p
            className="text-xs uppercase tracking-[0.2em] text-teal-400"
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
        <div className="mt-12 pt-8 border-t border-[#1f1f1f]">
          <UserButton />
        </div>
      </aside>
      <main className="p-8 min-w-0">{children}</main>
    </div>
  );
}
