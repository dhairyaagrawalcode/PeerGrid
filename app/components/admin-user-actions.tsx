"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminAccountStatus } from "@/app/actions/admin";
import ConfirmationModal from "./confirmation-modal";
import type { AccountStatus } from "@/app/types/admin";

const labels: Record<AccountStatus, string> = { active: "Restore access", suspended: "Suspend user", disabled: "Disable account", removed: "Remove account" };
export default function AdminUserActions({ userId, name, status, isAdmin }: { userId: string; name: string; status: AccountStatus; isAdmin: boolean }) {
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<AccountStatus | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (isAdmin) return <p className="text-xs text-muted">Admin account — protected from account actions</p>;
  return <div className="mt-4">
    <label className="block text-xs text-muted" htmlFor={userId}>Admin reason (optional)</label>
    <input className="field mt-2 !min-h-9 !text-xs" id={userId} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Recorded in the audit log" value={reason} />
    <div className="mt-3 flex flex-wrap gap-2">{(Object.keys(labels) as AccountStatus[]).filter((value) => value !== status).map((value) => <button className={`button !min-h-9 !px-3 !text-xs ${value === "removed" ? "button-danger" : "button-secondary"}`} disabled={pending} key={value} onClick={() => { setError(""); setAction(value); }} type="button">{labels[value]}</button>)}</div>
    {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
    <ConfirmationModal open={action !== null} title={`${action ? labels[action] : ""}: ${name}?`} description={action === "active" ? "This restores access to PeerGrid. The action and reason will be recorded." : action === "removed" ? "This removes access but preserves the account and its contributions. It is reversible; this does not permanently erase personal data." : "This blocks protected PeerGrid pages and data access. Existing contributions are preserved. You can restore access later."} confirmLabel={action ? labels[action] : "Confirm"} destructive={action !== "active"} pending={pending} onCancel={() => setAction(null)} onConfirm={() => {
      if (!action) return;
      start(async () => { const result = await setAdminAccountStatus(userId, action, reason); if (result.error) setError(result.error); else { setReason(""); router.refresh(); } setAction(null); });
    }} />
  </div>;
}
