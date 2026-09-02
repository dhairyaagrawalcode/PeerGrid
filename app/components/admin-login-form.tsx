"use client";
import { useActionState } from "react";
import { signInAdmin } from "@/app/actions/admin-login";
export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, { error: "" });
  return <form action={action} className="mt-8 space-y-5">
    <div><label className="label" htmlFor="admin-password">Admin password</label><input className="field mt-2" autoComplete="current-password" autoFocus id="admin-password" name="password" type="password" required maxLength={256} /></div>
    {state.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
    <button className="button button-primary w-full" disabled={pending}>{pending ? "Checking…" : "Open dashboard"}</button>
    <p className="text-xs leading-5 text-muted">Separate from your student login. Admin sessions expire after one hour.</p>
  </form>;
}
