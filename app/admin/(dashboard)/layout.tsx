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
    <header className="border-b border-line"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4"><Brand href="/admin" /><span className="text-xs font-semibold text-muted">Private administration</span><span className="ml-auto text-xs text-muted">Password admin</span><form action={signOutAdmin}><button className="button button-secondary !min-h-9 !text-xs">Lock dashboard</button></form></div></header>
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-7 lg:grid-cols-[160px_minmax(0,1fr)]">
      <nav aria-label="Admin navigation" className="flex flex-wrap content-start gap-1 lg:flex-col">{links.map(([href,label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-font">{label}</Link>)}<Link className="mt-4 px-3 text-xs text-primary" href="/feed">Back to PeerGrid</Link></nav>
      <main className="min-w-0"><Suspense fallback={null}><AdminLiveRefresh databaseHost={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host} /></Suspense>{children}</main>
    </div>
  </div>;
}
