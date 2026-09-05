"use client";
import Link from "next/link";
import { FiBell, FiCheck, FiX } from "react-icons/fi";
import { confirmCollaborationParticipation } from "@/app/actions/collaborations";
import { timeAgo } from "@/app/lib/format";
import { notificationPresentation } from "@/app/lib/notifications";
import { useNotifications } from "@/app/lib/use-notifications";
import type { PeerGridNotification } from "@/app/types";

export default function NotificationsList({ initialNotifications, pendingPassportIds }: { initialNotifications: PeerGridNotification[]; pendingPassportIds: string[] }) {
  const { notifications, busy, error, clear, markRead } = useNotifications(initialNotifications, 50);
  return <section className="mt-7">
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs"><button className="text-muted hover:text-font disabled:opacity-40" disabled={busy || !notifications.some(item => !item.read_at)} onClick={() => void markRead()} type="button">Mark all as read</button><button className="ml-auto text-muted hover:text-font disabled:opacity-40" disabled={busy || !notifications.length} onClick={() => void clear()} type="button">Clear all</button></div>
    {error && <p className="py-3 text-sm text-danger" role="alert">{error}</p>}
    {notifications.length ? <div className="divide-y divide-line">
      {notifications.map(notification => {
        const requiresAction = notification.type === "collaboration_confirmation_required" && Boolean(notification.passport_id && pendingPassportIds.includes(notification.passport_id));
        const presentation = notificationPresentation(notification);
        return <article className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-5 sm:flex sm:items-center sm:gap-4" key={notification.id}>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${requiresAction || !notification.read_at ? "bg-primary/10 text-primary" : "bg-card text-muted"}`}><FiBell /></span>
          <div className="min-w-0 flex-1"><p className="text-sm leading-6 text-subtle">{presentation.message}</p><p className="mt-1 text-[10px] text-muted">{timeAgo(notification.created_at)}</p></div>
          {requiresAction && notification.passport_id ? <div className="col-start-2 flex shrink-0 flex-wrap gap-2"><form action={confirmCollaborationParticipation}>
            <input name="passportId" type="hidden" value={notification.passport_id} /><input name="decision" type="hidden" value="confirm" /><input name="returnTo" type="hidden" value="/notifications" />
            <button className="button button-primary !min-h-9 !px-3 !text-xs" type="submit"><FiCheck /> Confirm</button></form>
            <form action={confirmCollaborationParticipation}><input name="passportId" type="hidden" value={notification.passport_id} /><input name="decision" type="hidden" value="decline" /><input name="returnTo" type="hidden" value="/notifications" /><button className="button button-secondary !min-h-9 !px-3 !text-xs" type="submit"><FiX /> Reject</button></form>
          </div> : <Link className="col-start-2 justify-self-start text-xs font-semibold text-primary hover:text-primary-hover" href={presentation.href}>View</Link>}
        </article>;
      })}
    </div> : <div className="py-20 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-card text-muted"><FiBell /></span><h2 className="mt-4 text-sm font-bold">You’re all caught up</h2><p className="mt-1 text-xs text-muted">New activity will appear here. Pending participation requests remain available on your profile.</p></div>}
  </section>;
}
