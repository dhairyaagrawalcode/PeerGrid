import { notFound } from "next/navigation";
import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getFollowSummary, getSocialPosts, getStudent, POST_PAGE_SIZE } from "@/app/lib/data";

export default async function StudentPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ page?: string }> }) {
  const { username } = await params;
  const rawPage = Number((await searchParams).page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const { supabase, user } = await requireStudent();
  const profile = await getStudent(supabase, { username });
  if (!profile?.is_verified) notFound();
  const [posts, followSummary] = await Promise.all([
    getSocialPosts(supabase, { authorId: profile.id, limit: POST_PAGE_SIZE + 1, offset: page * POST_PAGE_SIZE }),
    getFollowSummary(supabase, profile.id),
  ]);
  return <div className="app-page"><ProfileView currentId={user.id} followSummary={followSummary} hasMorePosts={posts.length > POST_PAGE_SIZE} own={profile.id === user.id} page={page} posts={posts.slice(0, POST_PAGE_SIZE)} profile={profile} /></div>;
}
