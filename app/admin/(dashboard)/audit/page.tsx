import { adminQuery, dateLabel, pageOffset } from "@/app/lib/admin";
import type { AuditEvent } from "@/app/types/admin";
import AdminPagination from "@/app/components/admin-pagination";
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const offset = pageOffset((await searchParams).page,50);
  const events = await adminQuery<AuditEvent[]>("admin_audit_events", { result_offset: offset });
  return <div><h1 className="text-2xl font-bold">Audit log</h1><p className="mt-2 text-sm text-muted">Read-only history of administrative changes. Times shown in IST.</p><div className="mt-6 divide-y divide-line">{events.slice(0,50).map(event => <article key={event.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold">{event.action.replaceAll("_"," ")}</h2><time className="text-xs text-muted">{dateLabel(event.created_at)}</time></div><p className="mt-2 break-all text-xs text-muted">{event.admin_email} · {event.resource_id || "Platform"}</p>{event.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-subtle">{event.reason}</p>}</article>)}</div>{!events.length && <p className="py-12 text-sm text-muted">No administrative changes yet.</p>}<AdminPagination path="/admin/audit" offset={offset} more={events.length > 50} size={50} /></div>;
}
