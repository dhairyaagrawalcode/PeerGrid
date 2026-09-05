"use client";
import { useState, useTransition } from "react";
import { submitIssue } from "@/app/actions/issues";
export default function IssueReportForm({ source }: { source: string }) {
  const [category, setCategory] = useState("bug"), [title,setTitle] = useState(""), [description,setDescription] = useState("");
  const [error,setError] = useState(""), [sent,setSent] = useState(false);
  const [pending,start] = useTransition();
  if (sent) return <div className="py-10"><h2 className="text-lg font-semibold">Report received</h2><p className="mt-3 text-sm text-muted">Thank you. The PeerGrid team can now review your report.</p><button className="button button-secondary mt-6" onClick={() => setSent(false)}>Report another problem</button></div>;
  return <form className="mt-7 space-y-5" onSubmit={event => { event.preventDefault(); setError(""); start(async () => { const result = await submitIssue(category,title,description,source); if (result.error) setError(result.error); else { setSent(true); setTitle(""); setDescription(""); setCategory("bug"); } }); }}>
    <div><label className="label" htmlFor="issue-category">Category</label><select className="field mt-2" id="issue-category" onChange={e=>setCategory(e.target.value)} value={category}>{[["bug","Bug"],["not_working","Something not working"],["account","Account issue"],["content","Content/reporting issue"],["suggestion","Feature suggestion"],["other","Other"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    <div><label className="label" htmlFor="issue-title">Short title</label><input className="field mt-2" id="issue-title" minLength={5} maxLength={120} required value={title} onChange={e=>setTitle(e.target.value)} /></div>
    <div><label className="label" htmlFor="issue-description">What happened?</label><textarea className="field mt-2" id="issue-description" minLength={10} maxLength={4000} rows={6} required value={description} onChange={e=>setDescription(e.target.value)} placeholder="What were you trying to do? What happened instead? Please don’t include passwords or private messages." /></div>
    <p className="text-xs leading-5 text-muted">Page: <span className="[overflow-wrap:anywhere]">{source}</span> · No device data or message content is collected automatically.</p>
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    <button className="button button-primary" disabled={pending}>{pending ? "Sending…" : "Submit report"}</button>
  </form>;
}
