import { adminQuery, dateLabel, pageOffset } from "@/app/lib/admin";
import type { AdminIssue } from "@/app/types/admin";
import AdminPagination from "@/app/components/admin-pagination";
import AdminIssueActions from "@/app/components/admin-issue-actions";
export default async function IssuesPage({ searchParams }: { searchParams: Promise<Record<string,string | undefined>> }) {
  const params = await searchParams;
  const q = params.q?.slice(0,120) || "", status = params.status || "", category = params.category || "";
  const validDate = (date?: string) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : "";
  const since = validDate(params.since), until = validDate(params.until), offset = pageOffset(params.page);
  const issues = await adminQuery<AdminIssue[]>("admin_list_issues", { search_text: q, status_filter: status, category_filter: category, since_date: since || null, until_date: until || null, result_offset: offset });
  return <div><h1 className="text-2xl font-bold">Issues</h1><p className="mt-2 text-sm text-muted">Problem reports from PeerGrid users.</p>
    <form className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs text-muted">Search / reporter<input className="field mt-2" defaultValue={q} name="q" maxLength={120} placeholder="Title, name, email, username, ID" /></label>
    <label className="text-xs text-muted">Status<select className="field mt-2" name="status" defaultValue={status}><option value="">All statuses</option>{["new","investigating","resolved","closed"].map(s => <option key={s}>{s}</option>)}</select></label>
    <label className="text-xs text-muted">Category<select className="field mt-2" name="category" defaultValue={category}><option value="">All categories</option>{["bug","not_working","account","content","suggestion","other"].map(s => <option value={s} key={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
    <label className="text-xs text-muted">From (IST)<input className="field mt-2" name="since" type="date" defaultValue={since} /></label><label className="text-xs text-muted">Through (IST)<input className="field mt-2" name="until" type="date" defaultValue={until} /></label><button className="button button-secondary self-end">Apply filters</button></form>
    <div className="divide-y divide-line">{issues.slice(0,30).map(issue => <article className="py-6" key={issue.id}><div className="flex justify-between gap-4"><h2 className="font-semibold">{issue.title}</h2><span className="text-xs capitalize text-muted">{issue.status}</span></div><p className="mt-2 text-xs text-muted">{issue.full_name || issue.reporter_email} {issue.username && `· @${issue.username}`} · {issue.category.replaceAll("_"," ")} · {dateLabel(issue.created_at)}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-subtle">{issue.description}</p><p className="mt-3 break-all text-xs text-muted">Page: {issue.source_path || "Not recorded"} · {issue.reporter_email}</p><AdminIssueActions id={issue.id} status={issue.status} /></article>)}</div>
    {!issues.length && <p className="py-12 text-sm text-muted">No reports match these filters.</p>}
    <AdminPagination path="/admin/issues" offset={offset} more={issues.length > 30} query={{q,status,category,since,until}} />
  </div>;
}
