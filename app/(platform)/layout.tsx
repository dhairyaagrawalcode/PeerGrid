import type { ReactNode } from "react";
import AppShell from "@/app/components/app-shell";
import SetupRequired from "@/app/components/setup-required";
import { requireStudent } from "@/app/lib/auth";
import { getUnreadMessageCount } from "@/app/lib/data";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  const { profile, supabase } = await requireStudent();
  const unreadCount = await getUnreadMessageCount(supabase);
  return (
    <AppShell initialUnreadCount={unreadCount} profile={profile}>
      {children}
    </AppShell>
  );
}
