import ProfileView from "@/app/components/profile-view";
import { requireStudent } from "@/app/lib/auth";
import { getCollaborationProofs, getFollowSummary, getPendingCollaborationConfirmations, getSocialPosts, getStudent, POST_PAGE_SIZE } from "@/app/lib/data";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ page?: string; confirmation?: string }> }) {
  const params = await searchParams;
  const rawPage = Number(params.page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const { supabase, user } = await requireStudent();
  const [profile, posts, followSummary, proofs, pendingConfirmations] = await Promise.all([
    getStudent(supabase, { id: user.id }),
    getSocialPosts(supabase, { authorId: user.id, limit: POST_PAGE_SIZE + 1, offset: page * POST_PAGE_SIZE }),
    getFollowSummary(supabase, user.id),
    getCollaborationProofs(supabase, user.id),
    getPendingCollaborationConfirmations(supabase, user.id),
  ]);
  if (!profile) return null;
  return <div className="app-page">{params.confirmation === "error" && <p className="mx-auto mb-5 max-w-[920px] rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">Could not update this collaboration confirmation. Apply the latest Supabase migration, then try again.</p>}<ProfileView currentId={user.id} followSummary={followSummary} hasMorePosts={posts.length > POST_PAGE_SIZE} own page={page} pendingConfirmations={pendingConfirmations} posts={posts.slice(0, POST_PAGE_SIZE)} profile={profile} proofs={proofs} /></div>;
}
