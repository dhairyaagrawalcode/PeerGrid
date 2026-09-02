import { FiUsers } from "react-icons/fi";
import CollaborationCard from "@/app/components/collaboration-card";
import CollaborationViewTracker from "@/app/components/collaboration-view-tracker";
import CollaborationSeenTracker from "@/app/components/collaboration-seen-tracker";
import EmptyState from "@/app/components/empty-state";
import PageNavigation from "@/app/components/page-navigation";
import CollaborationCreateForm from "@/app/components/collaboration-create-form";
import { requireStudent } from "@/app/lib/auth";
import { COLLABORATION_PAGE_SIZE, getCampuses, getCollaborations } from "@/app/lib/data";

export default async function CollaboratePage({ searchParams }: { searchParams: Promise<{ page?: string; moderation?: string; completion?: string; create?: string; delete?: string }> }) {
  const params = await searchParams;
  const rawPage = Number(params.page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const { supabase, user } = await requireStudent();
  const [campuses, posts] = await Promise.all([
    getCampuses(supabase),
    getCollaborations(supabase, { limit: COLLABORATION_PAGE_SIZE + 1, offset: page * COLLABORATION_PAGE_SIZE, ranked: true }),
  ]);
  const hasMore = posts.length > COLLABORATION_PAGE_SIZE;
  const visiblePosts = posts.slice(0, COLLABORATION_PAGE_SIZE);
  return (
    <div className="app-page grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <CollaborationSeenTracker />
      <div className="min-w-0 xl:order-1">
        <div><p className="eyebrow">Collaboration board</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Build with people, not alone</h1><p className="mt-2 text-sm text-muted">Find an open project, connect with its creator in DM, and build together.</p></div>
        {params.moderation === "held" && <p className="mt-4 text-sm text-muted" role="status">Your collaboration is being reviewed before publication.</p>}
        {params.create === "published" && <p className="mt-4 text-sm text-muted" role="status">Your collaboration is now live.</p>}
        {params.delete === "success" && <p className="mt-4 text-sm text-muted" role="status">The collaboration was deleted.</p>}
        {params.delete === "error" && <p className="mt-4 text-sm text-danger" role="alert">The collaboration could not be deleted. Please try again.</p>}
        {params.moderation === "rejected" && <p className="mt-4 text-sm text-danger" role="alert">This collaboration could not be published because it violates the community rules.</p>}
        {params.completion === "recorded" && <p className="mt-4 text-sm text-muted" role="status">Completion recorded. Invited participants must confirm before it appears as verified proof of work.</p>}
        {(params.completion === "error" || params.create === "error") && <p className="mt-4 text-sm text-danger" role="alert">That change could not be saved. Check the details and try again.</p>}
        <CollaborationViewTracker ids={visiblePosts.map((post) => post.id)} />
        <div className="mt-6 space-y-4">{visiblePosts.length ? visiblePosts.map((post) => <CollaborationCard campuses={campuses} key={post.id} post={post} currentId={user.id} />) : <EmptyState icon={<FiUsers size={21} />} title="No collaboration posts yet" copy="Share the first open call with students across NST." />}</div>
        <PageNavigation hasMore={hasMore} page={page} path="/collaborate" />
      </div>
      <aside className="xl:order-2">
        <CollaborationCreateForm campuses={campuses} />
      </aside>
    </div>
  );
}
