"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminIssueStatus } from "@/app/actions/admin";
import type { IssueStatus } from "@/app/types/admin";
export default function AdminIssueActions({ id, status }: { id: string; status: IssueStatus }) {
  const [draftStatus, setDraftStatus] = useState<IssueStatus | null>(null);
  const nextStatus = draftStatus ?? status;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); start(async () => { const result = await setAdminIssueStatus(id, nextStatus, reason); setError(result.error || ""); if (result.success) { setReason(""); setDraftStatus(null); router.refresh(); } }); }}>
    <select aria-label="Issue status" className="field !w-auto !min-h-9 !text-xs" onChange={(e) => setDraftStatus(e.target.value as IssueStatus)} value={nextStatus}>{["new","investigating","resolved","closed"].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select>
    <input aria-label="Admin reason" className="field min-w-40 flex-1 !min-h-9 !text-xs" maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Optional audit reason" value={reason} />
    <button className="button button-secondary !min-h-9 !text-xs" disabled={pending || nextStatus === status}>{pending ? "Saving…" : "Update status"}</button>
    {error && <p className="w-full text-xs text-danger" role="alert">{error}</p>}
  </form>;
}
