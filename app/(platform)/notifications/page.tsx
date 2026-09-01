import Link from "next/link";
import { FiBell, FiCheck, FiX } from "react-icons/fi";
import { confirmCollaborationParticipation } from "@/app/actions/collaborations";
import NotificationSeenTracker from "@/app/components/notification-seen-tracker";
import { requireStudent } from "@/app/lib/auth";
import { getNotifications, getPendingCollaborationConfirmations } from "@/app/lib/data";
import { timeAgo } from "@/app/lib/format";
import { notificationPresentation } from "@/app/lib/notifications";

export default async function NotificationsPage({ searchParams }: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile } = await requireStudent();
  const [notifications, pendingConfirmations] = await Promise.all([
    getNotifications(supabase),
    getPendingCollaborationConfirmations(supabase, profile.id),
  ]);
  const pendingPassportIds = new Set(pendingConfirmations.map((item) => item.passport_id));
  return <div className="app-page mx-auto max-w-3xl">
    <NotificationSeenTracker />
    <div>
      <p className="eyebrow">Activity</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
      <p className="mt-2 text-sm text-muted">Followers, posts, collaborations, groups, and participation updates.</p>
    </div>
    {params.confirmation === "error" && <p className="mt-5 text-sm text-danger" role="alert">That participation response could not be saved.</p>}
    <section className="mt-7">
      {notifications.length ? <div className="divide-y divide-line">
        {notifications.map((notification) => {
          const requiresAction = notification.type === "collaboration_confirmation_required" && Boolean(notification.passport_id && pendingPassportIds.has(notification.passport_id));
          const presentation = notificationPresentation(notification);
          return <article className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center" key={notification.id}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${requiresAction ? "bg-primary/10 text-primary" : "bg-card text-muted"}`}><FiBell /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-subtle">{presentation.message}</p>
              <p className="mt-1 text-[10px] text-muted">{timeAgo(notification.created_at)}</p>
            </div>
            {requiresAction && notification.passport_id ? <div className="flex shrink-0 gap-2">
              <form action={confirmCollaborationParticipation}>
                <input name="passportId" type="hidden" value={notification.passport_id} />
                <input name="decision" type="hidden" value="confirm" />
                <input name="returnTo" type="hidden" value="/notifications" />
                <button className="button button-primary !min-h-9 !px-3 !text-xs" type="submit"><FiCheck /> Confirm</button>
              </form>
              <form action={confirmCollaborationParticipation}>
                <input name="passportId" type="hidden" value={notification.passport_id} />
                <input name="decision" type="hidden" value="decline" />
                <input name="returnTo" type="hidden" value="/notifications" />
                <button className="button button-secondary !min-h-9 !px-3 !text-xs" type="submit"><FiX /> Reject</button>
              </form>
            </div> : <Link className="text-xs font-semibold text-primary hover:text-primary-hover" href={presentation.href}>View</Link>}
          </article>;
        })}
      </div> : <div className="py-20 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-card text-muted"><FiBell /></span><h2 className="mt-4 text-sm font-bold">You’re all caught up</h2><p className="mt-1 text-xs text-muted">Important collaboration updates will appear here.</p></div>}
    </section>
  </div>;
}
