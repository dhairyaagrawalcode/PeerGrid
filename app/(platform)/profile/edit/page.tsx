import ProfileForm from "@/app/components/profile-form";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses, getStudent } from "@/app/lib/data";

export default async function EditProfilePage() {
  const { supabase, user } = await requireStudent();
  const [profile, campuses] = await Promise.all([getStudent(supabase, { id: user.id }), getCampuses(supabase)]);
  return <section className="surface mx-auto max-w-4xl p-5 sm:p-8"><p className="eyebrow">Profile settings</p><h1 className="mt-2 text-2xl font-black tracking-tight">Edit your profile</h1><p className="mt-2 text-sm text-muted">Keep this current so the right students can discover you.</p><div className="my-7 h-px bg-white/6" /><ProfileForm campuses={campuses} profile={profile} returnTo="/profile" /></section>;
}
