import ProfileForm from "@/app/components/profile-form";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses } from "@/app/lib/data";

export default async function EditProfilePage() {
  const { supabase, profile } = await requireStudent();
  const campuses = await getCampuses(supabase);
  return (
    <div className="app-page">
      <section className="edit-profile-section mx-auto max-w-4xl py-6 sm:py-8">
        <p className="mobile-hide eyebrow">Profile settings</p>
        <h1 className="mobile-hide mt-2 text-2xl font-black tracking-tight">
          Edit your profile
        </h1>
        <p className="mobile-hide mt-2 text-sm text-muted">
          Keep this current so the right students can discover you.
        </p>
        <div className="edit-profile-form mt-7 border-t border-line pt-7"><ProfileForm campuses={campuses} profile={profile} returnTo="/profile" /></div>
      </section>
    </div>
  );
}
