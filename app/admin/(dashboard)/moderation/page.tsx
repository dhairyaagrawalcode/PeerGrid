import Link from "next/link";
import { adminQuery, dateLabel, pageOffset } from "@/app/lib/admin";
import type { ModerationReport } from "@/app/types/admin";
import AdminPagination from "@/app/components/admin-pagination";
export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const offset = pageOffset((await searchParams).page);
  const reports = await adminQuery<ModerationReport[]>("admin_moderation_reports", { result_offset: offset });
  return <div><h1 className="text-2xl font-bold">Reported content</h1><p className="mt-2 text-sm text-muted">Review existing post reports. Account moderation is available under <Link href="/admin/users" className="text-primary">Users</Link>; problem reports are under <Link href="/admin/issues" className="text-primary">Issues</Link>.</p><div className="mt-6 divide-y divide-line">{reports.slice(0,30).map(report => <article className="py-5" key={report.id}><h2 className="text-sm font-semibold">{report.reason.replaceAll("_"," ")}</h2><p className="mt-2 text-xs text-muted">{report.reporter || "Former user"} · {dateLabel(report.created_at)} · {report.moderation_status}</p>{report.details && <p className="mt-3 text-sm text-subtle">{report.details}</p>}<blockquote className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{report.body}</blockquote><p className="mt-3 break-all font-mono text-xs text-muted">Post ID: {report.post_id}</p></article>)}</div>{!reports.length && <p className="py-12 text-sm text-muted">No reported posts.</p>}<AdminPagination path="/admin/moderation" offset={offset} more={reports.length > 30} /></div>;
}
