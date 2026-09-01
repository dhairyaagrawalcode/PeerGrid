import type { ReactNode } from "react";
import AppShell from "@/app/components/app-shell";
import SetupRequired from "@/app/components/setup-required";
import { requireStudent } from "@/app/lib/auth";
import { getNotifications, getUnreadCollaborationCount, getUnreadMessageCount, getUnreadNotificationCount } from "@/app/lib/data";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  const { profile, supabase } = await requireStudent();
  const [unreadCount, unreadCollaborationCount, unreadNotificationCount, notifications] = await Promise.all([
    getUnreadMessageCount(supabase),
    getUnreadCollaborationCount(supabase),
    getUnreadNotificationCount(supabase),
    getNotifications(supabase, 8),
  ]);
  return (
    <AppShell
      initialCollaborationUnreadCount={unreadCollaborationCount}
      initialNotificationUnreadCount={unreadNotificationCount}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}
