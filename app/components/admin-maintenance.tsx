"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminMaintenance } from "@/app/actions/admin";
import ConfirmationModal from "./confirmation-modal";
export default function AdminMaintenance({ enabled, message }: { enabled: boolean; message: string }) {
  const [draftText, setDraftText] = useState<string | null>(null);
  const text = draftText ?? message;
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(enabled);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <div className="mt-7 max-w-xl"><p className="text-sm">Maintenance is <strong>{enabled ? "enabled" : "disabled"}</strong>.</p><p className="mt-2 text-sm leading-6 text-muted">When enabled, normal users cannot access protected pages or product data. Admin access remains available.</p>
    <label className="label mt-6" htmlFor="maintenance-message">Public maintenance message</label><textarea className="field mt-2" id="maintenance-message" maxLength={300} rows={3} onChange={e => setDraftText(e.target.value)} value={text} />
    <label className="label mt-4" htmlFor="maintenance-reason">Admin reason (optional)</label><input className="field mt-2" id="maintenance-reason" maxLength={500} onChange={e => setReason(e.target.value)} value={reason} />
    <div className="mt-5 flex flex-wrap gap-3"><button className="button button-primary" disabled={pending || !text.trim()} onClick={() => { setTarget(!enabled); setOpen(true); }}> {enabled ? "Disable maintenance mode" : "Enable maintenance mode"}</button>{text !== message && <button className="button button-secondary" disabled={pending || !text.trim()} onClick={() => { setTarget(enabled); setOpen(true); }}>Save message</button>}</div>
    {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
    <ConfirmationModal open={open} title={target === enabled ? "Update maintenance message?" : target ? "Enable maintenance mode?" : "Disable maintenance mode?"} description={target ? "Normal users will see the maintenance page. Product access is blocked at the database and application layers. Admin access stays available." : "Normal users will be able to use PeerGrid again, subject to their account and approval status."} confirmLabel="Apply change" destructive={target} pending={pending} onCancel={() => setOpen(false)} onConfirm={() => start(async () => { const result = await setAdminMaintenance(target,text,reason); setError(result.error || ""); if (result.success) { setReason(""); setDraftText(null); router.refresh(); } setOpen(false); })} />
  </div>;
}
