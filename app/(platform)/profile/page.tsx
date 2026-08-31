import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getFollowSummary, getSocialPosts, getStudent, POST_PAGE_SIZE } from "@/app/lib/data";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const rawPage = Number((await searchParams).page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const { supabase, user } = await requireStudent();
  const [profile, posts, followSummary] = await Promise.all([
    getStudent(supabase, { id: user.id }),
    getSocialPosts(supabase, { authorId: user.id, limit: POST_PAGE_SIZE + 1, offset: page * POST_PAGE_SIZE }),
    getFollowSummary(supabase, user.id),
  ]);
  if (!profile) return null;
  return <div className="app-page"><ProfileView currentId={user.id} followSummary={followSummary} hasMorePosts={posts.length > POST_PAGE_SIZE} own page={page} posts={posts.slice(0, POST_PAGE_SIZE)} profile={profile} /></div>;
}
