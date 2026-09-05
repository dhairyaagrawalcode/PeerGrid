import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/app/lib/admin";
import { signOutAdmin } from "@/app/actions/admin-login";
import Brand from "@/app/components/brand";
import { Suspense } from "react";
import AdminLiveRefresh from "@/app/components/admin-live-refresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "PeerGrid Admin", robots: { index: false, follow: false } };
const links = [["/admin","Overview"],["/admin/users","Users"],["/admin/issues","Issues"],["/admin/analytics","Analytics"],["/admin/moderation","Moderation"],["/admin/audit","Audit log"],["/admin/settings","Settings"]];
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <div className="min-h-dvh bg-bg text-font">
    <header className="border-b border-line">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4 sm:flex sm:gap-4 sm:px-5">
        <Brand href="/admin" />
        <span className="row-start-2 text-xs font-semibold text-muted">Private administration</span>
        <span className="row-start-2 text-right text-xs text-muted sm:ml-auto">Password admin</span>
        <form action={signOutAdmin} className="col-start-2 row-start-1"><button className="button button-secondary !min-h-9 !px-3 !text-xs">Lock dashboard</button></form>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:gap-8 sm:px-5 sm:py-7 lg:grid-cols-[160px_minmax(0,1fr)]">
      <nav aria-label="Admin navigation" className="grid grid-cols-3 content-start gap-1 min-[400px]:grid-cols-4 sm:flex sm:flex-wrap lg:flex-col">
        {links.map(([href,label]) => <Link key={href} href={href} className="rounded-lg px-2 py-3 text-xs text-muted hover:bg-panel hover:text-font sm:px-3 sm:py-2 sm:text-sm">{label}</Link>)}
        <Link className="rounded-lg px-2 py-3 text-xs text-primary sm:px-3 lg:mt-4" href="/feed">Back to PeerGrid</Link>
      </nav>
      <main className="min-w-0 [overflow-wrap:anywhere]"><Suspense fallback={null}><AdminLiveRefresh databaseHost={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host} /></Suspense>{children}</main>
    </div>
  </div>;
}
