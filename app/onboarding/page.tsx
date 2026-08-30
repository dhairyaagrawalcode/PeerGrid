import { redirect } from "next/navigation";
import Brand from "@/app/components/brand";
import ProfileForm from "@/app/components/profile-form";
import SetupRequired from "@/app/components/setup-required";
import { getAuthContext } from "@/app/lib/auth";
import { getCampuses, getStudent } from "@/app/lib/data";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  const { supabase, user, profile, approval } = await getAuthContext();
  if (!user) redirect("/auth/login");
  if (!user.email_confirmed_at) redirect(`/auth/check-email?email=${encodeURIComponent(user.email ?? "")}`);
  if (approval?.status !== "approved") redirect("/pending-approval");
  const campuses = await getCampuses(supabase);

  const enriched = profile?.id
    ? await getStudent(supabase, { id: profile.id }).catch(() => profile)
    : profile;

  return (
    <main className="min-h-screen bg-bg px-5 py-8 text-font sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Brand />
        <section className="surface mt-9 p-5 sm:p-9">
          <p className="eyebrow">Final step</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Build your student profile</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Your verified profile powers discovery. Only your name, username, and campus are required; add the details that help the right peers find you.</p>
          <div className="my-8 h-px bg-line" />
          <ProfileForm campuses={campuses} profile={enriched} returnTo="/feed" />
        </section>
      </div>
    </main>
  );
}
