import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getStudent } from "@/app/lib/data";

export default async function ProfilePage() {
  const { supabase, user } = await requireStudent();
  const profile = await getStudent(supabase, { id: user.id });
  if (!profile) return null;
  return <ProfileView profile={profile} currentId={user.id} own />;
}

