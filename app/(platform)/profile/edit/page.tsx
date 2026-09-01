import ProfileForm from "@/app/components/profile-form";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses, getStudent } from "@/app/lib/data";

export default async function EditProfilePage() {
  const { supabase, user } = await requireStudent();
  const [profile, campuses] = await Promise.all([
    getStudent(supabase, { id: user.id }),
    getCampuses(supabase),
  ]);
  return (
    <div className="app-page">
      <section className="mx-auto max-w-4xl py-6 sm:py-8">
        <p className="eyebrow">Profile settings</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          Edit your profile
        </h1>
        <p className="mt-2 text-sm text-muted">
          Keep this current so the right students can discover you.
        </p>
        <div className="mt-7 border-t border-line pt-7"><ProfileForm campuses={campuses} profile={profile} returnTo="/profile" /></div>
      </section>
    </div>
  );
}
