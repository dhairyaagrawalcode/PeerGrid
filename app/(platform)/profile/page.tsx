import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getFollowSummary, getSocialPosts, getStudent } from "@/app/lib/data";

export default async function ProfilePage() {
  const { supabase, user } = await requireStudent();
  const [profile, posts, followSummary] = await Promise.all([
    getStudent(supabase, { id: user.id }),
    getSocialPosts(supabase, { authorId: user.id }),
    getFollowSummary(supabase, user.id),
  ]);
  if (!profile) return null;
  return <ProfileView currentId={user.id} followSummary={followSummary} own posts={posts} profile={profile} />;
}
