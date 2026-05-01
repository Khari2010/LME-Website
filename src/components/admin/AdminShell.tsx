import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white grid grid-cols-[260px_1fr]">
      <aside className="border-r border-gray-900 p-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-teal-400">LME</p>
          <p className="font-bold">Admin</p>
        </div>
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block px-3 py-2 rounded hover:bg-gray-900">Dashboard</Link>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #2">Bookings</span>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #1b">Compose</span>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #1b">Library</span>
          <span className="block px-3 py-2 text-gray-600 cursor-not-allowed" title="Coming in #3">Tasks</span>
        </nav>
        <div className="mt-12 pt-8 border-t border-gray-900">
          <UserButton />
        </div>
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}
