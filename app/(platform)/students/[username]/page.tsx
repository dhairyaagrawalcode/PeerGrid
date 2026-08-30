import { notFound } from "next/navigation";
import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getConnections, getStudent } from "@/app/lib/data";

export default async function StudentPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, user } = await requireStudent();
  const [profile, connections] = await Promise.all([getStudent(supabase, { username }), getConnections(supabase, user.id)]);
  if (!profile?.is_verified) notFound();
  if (profile.id === user.id) return <ProfileView profile={profile} currentId={user.id} own />;
  const connection = connections.find((item) => item.requester_id === profile.id || item.recipient_id === profile.id);
  return <ProfileView profile={profile} currentId={user.id} connection={connection} />;
}

