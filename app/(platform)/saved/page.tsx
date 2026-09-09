import Link from "next/link";
import { FiBookmark } from "react-icons/fi";
import EmptyState from "@/app/components/empty-state";
import PageNavigation from "@/app/components/page-navigation";
import SocialPostCard from "@/app/components/social-post-card";
import { requireStudent } from "@/app/lib/auth";
import { getSavedSocialPosts, POST_PAGE_SIZE } from "@/app/lib/data";

export default async function SavedPostsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const rawPage = Number(params.page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const { supabase, user } = await requireStudent();
  const posts = await getSavedSocialPosts(supabase, user.id, {
    limit: POST_PAGE_SIZE + 1,
    offset: page * POST_PAGE_SIZE,
  });
  const visiblePosts = posts.slice(0, POST_PAGE_SIZE);
  const hasMore = posts.length > POST_PAGE_SIZE;

  return <div className="app-page saved-posts-page">
    <div className="mobile-hide">
      <p className="eyebrow">Your collection</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Saved posts</h1>
      <p className="mt-2 text-sm text-muted">Posts you save are private and only visible to you.</p>
    </div>
    <div className="feed-post-list space-y-4 md:mt-7">
      {visiblePosts.length ? visiblePosts.map((post) => <SocialPostCard key={post.id} own={post.author_id === user.id} post={post} />) : <EmptyState action={<Link className="button button-primary" href="/feed">Browse posts</Link>} copy="Tap the bookmark on a post to keep it here for later." icon={<FiBookmark size={21} />} title="No saved posts yet" />}
    </div>
    <PageNavigation hasMore={hasMore} page={page} path="/saved" />
  </div>;
}
