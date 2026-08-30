import { notFound } from "next/navigation";
import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getFollowSummary, getSocialPosts, getStudent } from "@/app/lib/data";

export default async function StudentPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, user } = await requireStudent();
  const profile = await getStudent(supabase, { username });
  if (!profile?.is_verified) notFound();
  const [posts, followSummary] = await Promise.all([
    getSocialPosts(supabase, { authorId: profile.id }),
    getFollowSummary(supabase, profile.id),
  ]);
  return <div className="app-page"><ProfileView currentId={user.id} followSummary={followSummary} own={profile.id === user.id} posts={posts} profile={profile} /></div>;
}
