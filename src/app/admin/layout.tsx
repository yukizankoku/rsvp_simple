import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { eventInfo } from "@/lib/event";
import { logout } from "./actions";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
        {/* Mobile: title + logout on the first row, full-width nav below. sm+: one row. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <Link href="/admin" className="min-w-0 flex-1 truncate font-bold tracking-tight">
            {eventInfo().name}
          </Link>
          <form action={logout} className="sm:order-last">
            <button className="min-h-10 rounded-lg px-3 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              Keluar
            </button>
          </form>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
