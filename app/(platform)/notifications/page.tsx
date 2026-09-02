import NotificationsList from "@/app/components/notifications-list";
import { requireStudent } from "@/app/lib/auth";
import { getNotifications, getPendingCollaborationConfirmations } from "@/app/lib/data";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireStudent();
  const [notifications, pendingConfirmations] = await Promise.all([getNotifications(supabase), getPendingCollaborationConfirmations(supabase, profile.id)]);
  return <div className="app-page mx-auto max-w-3xl"><div><p className="eyebrow">Activity</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1><p className="mt-2 text-sm text-muted">Followers, posts, collaborations, groups, and participation updates.</p></div>
    {params.confirmation === "error" && <p className="mt-5 text-sm text-danger" role="alert">That participation response could not be saved.</p>}
    <NotificationsList initialNotifications={notifications} pendingPassportIds={pendingConfirmations.map(item => item.passport_id)} />
  </div>;
}
