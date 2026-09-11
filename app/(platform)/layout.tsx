import { Suspense, type ReactNode } from "react";
import AppShell from "@/app/components/app-shell";
import SetupRequired from "@/app/components/setup-required";
import { requireStudent } from "@/app/lib/auth";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import PlatformShellSkeleton from "@/app/components/platform-shell-skeleton";

export default function PlatformLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  return <Suspense fallback={<PlatformShellSkeleton />}><ProtectedShell modal={modal}>{children}</ProtectedShell></Suspense>;
}

async function ProtectedShell({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const { profile } = await requireStudent();
  return (
    <AppShell
      profile={profile}
      modal={modal}
    >
      {children}
    </AppShell>
  );
}
