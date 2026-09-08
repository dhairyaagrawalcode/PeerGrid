import Link from "next/link";
import AdminChart from "@/app/components/admin-chart";
import { adminQuery, dateLabel } from "@/app/lib/admin";
import type { AdminOverviewSnapshot } from "@/app/types/admin";

function MetricGroup({ title, metrics }: { title: string; metrics: [string, number][] }) {
  return <section className="rounded-2xl border border-line bg-panel/30 p-4 sm:p-5">
    <h2 className="text-sm font-semibold">{title}</h2>
    <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3">{metrics.map(([label, value]) => <div key={label}><p className="text-xs leading-5 text-muted">{label}</p><strong className="mt-1 block text-2xl">{Number(value).toLocaleString("en-IN")}</strong></div>)}</div>
  </section>;
}

export default async function AdminPage() {
  const overview = await adminQuery<AdminOverviewSnapshot>("admin_overview_snapshot");
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Overview</h1><p className="mt-2 text-sm text-muted">Live operational totals from Supabase. Activity reflects the last recorded authenticated session.</p></div><p className="text-xs text-muted">Snapshot {dateLabel(overview.refreshed_at)}</p></div>

    <div className="my-7 grid gap-4 xl:grid-cols-3">
      <MetricGroup title="Accounts" metrics={[["Auth accounts", overview.total_users], ["Public profiles", overview.profile_count], ["Without profile", overview.accounts_without_profile], ["Joined today", overview.signups_today], ["Joined this week", overview.signups_week], ["Joined this month", overview.signups_month]]} />
      <MetricGroup title="Activity" metrics={[["Active · 15m", overview.recently_active], ["Active · 24h", overview.daily_active], ["Active · 7 days", overview.weekly_active], ["Active · 30 days", overview.monthly_active], ["Posts", overview.posts], ["Messages · count only", overview.messages]]} />
      <MetricGroup title="Operations" metrics={[["Collaborations", overview.collaborations], ["Open / full", overview.active_collaborations], ["Content reports", overview.reports], ["Issue reports", overview.issues], ["Needs attention", overview.unresolved_reports], ["Suspended accounts", overview.suspended_accounts]]} />
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Link className="rounded-2xl border border-line p-4 transition hover:border-primary/50 hover:bg-panel" href="/admin/issues?status=new"><span className="block text-2xl font-bold">{overview.new_issues}</span><span className="mt-1 block text-sm text-muted">New issues to review →</span></Link>
      <Link className="rounded-2xl border border-line p-4 transition hover:border-primary/50 hover:bg-panel" href="/admin/moderation"><span className="block text-2xl font-bold">{overview.unresolved_reports}</span><span className="mt-1 block text-sm text-muted">Unresolved moderation and issue work →</span></Link>
    </div>

    <div className="mt-10 grid gap-8 md:grid-cols-2"><AdminChart title="Signups over time" points={overview.signups} /><AdminChart title="Daily active users" points={overview.active_days} /></div>

    <section className="mt-10 border-t border-line pt-7">
      <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Security trail</p><h2 className="mt-2 text-lg font-bold">Recent admin activity</h2></div><Link className="text-sm text-primary" href="/admin/audit">View audit log</Link></div>
      {overview.recent_admin_activity.length ? <div className="mt-4 divide-y divide-line">{overview.recent_admin_activity.map((event) => <article className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]" key={event.id}><p><span className="font-semibold">{event.admin_email}</span> <span className="text-muted">{event.action.replaceAll("_", " ")}</span>{event.resource_id && <span className="text-muted"> · {event.resource_id}</span>}</p><time className="text-xs text-muted">{dateLabel(event.created_at)}</time>{event.reason && <p className="text-xs text-muted sm:col-span-2">{event.reason}</p>}</article>)}</div> : <p className="mt-4 text-sm text-muted">No administrative changes have been recorded yet.</p>}
    </section>
  </>;
}
