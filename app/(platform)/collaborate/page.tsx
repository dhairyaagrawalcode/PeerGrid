import { FiEdit3, FiUsers } from "react-icons/fi";
import CollaborationCard from "@/app/components/collaboration-card";
import CollaborationViewTracker from "@/app/components/collaboration-view-tracker";
import CollaborationSeenTracker from "@/app/components/collaboration-seen-tracker";
import EmptyState from "@/app/components/empty-state";
import PageNavigation from "@/app/components/page-navigation";
import { createCollaboration } from "@/app/actions/collaborations";
import { requireStudent } from "@/app/lib/auth";
import { COLLABORATION_PAGE_SIZE, getCampuses, getCollaborations } from "@/app/lib/data";

export default async function CollaboratePage({ searchParams }: { searchParams: Promise<{ page?: string; moderation?: string; completion?: string; create?: string }> }) {
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
        {params.moderation === "rejected" && <p className="mt-4 text-sm text-danger" role="alert">This collaboration could not be published because it violates the community rules.</p>}
        {params.completion === "recorded" && <p className="mt-4 text-sm text-muted" role="status">Completion recorded. Invited participants must confirm before it appears as verified proof of work.</p>}
        {(params.completion === "error" || params.create === "error") && <p className="mt-4 text-sm text-danger" role="alert">That change could not be saved. Check the details and try again.</p>}
        <CollaborationViewTracker ids={visiblePosts.map((post) => post.id)} />
        <div className="mt-6 space-y-4">{visiblePosts.length ? visiblePosts.map((post) => <CollaborationCard campuses={campuses} key={post.id} post={post} currentId={user.id} />) : <EmptyState icon={<FiUsers size={21} />} title="No collaboration posts yet" copy="Share the first open call with students across NST." />}</div>
        <PageNavigation hasMore={hasMore} page={page} path="/collaborate" />
      </div>
      <aside className="xl:order-2">
        <form action={createCollaboration} className="surface scroll-mt-24 p-5 xl:sticky xl:top-20" id="new">
          <div className="flex items-center gap-2"><FiEdit3 className="text-secondary" /><h2 className="font-bold">Create a collaboration</h2></div>
          <div className="mt-5 space-y-4">
            <div><label className="label" htmlFor="title">Title</label><input className="field" id="title" name="title" minLength={5} maxLength={100} placeholder="Need 2 students for SIH" required /></div>
            <div><label className="label" htmlFor="description">What are you building?</label><textarea className="field" id="description" name="description" minLength={10} maxLength={1200} placeholder="Share the idea, current progress, and the kind of collaborator you need." required /></div>
            <div><label className="label" htmlFor="collaborationType">Type</label><select className="field" id="collaborationType" name="collaborationType" defaultValue="project"><option value="project">Project</option><option value="hackathon">Hackathon</option><option value="open_source">Open source</option><option value="startup">Startup</option><option value="study">Study group</option><option value="other">Other</option></select></div>
            <div><label className="label" htmlFor="requiredSkills">Required skills</label><input className="field" id="requiredSkills" name="requiredSkills" placeholder="React, FastAPI, product design" /><p className="mt-1.5 text-xs text-muted">Up to 12, separated with commas.</p></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="teamCurrent">Current team</label><input className="field" id="teamCurrent" name="teamCurrent" type="number" min={1} max={50} defaultValue={1} required /></div><div><label className="label" htmlFor="teamCapacity">Capacity</label><input className="field" id="teamCapacity" name="teamCapacity" type="number" min={1} max={50} placeholder="4" required /></div></div>
            <div><label className="label" htmlFor="commitment">Commitment / duration</label><input className="field" id="commitment" name="commitment" maxLength={80} placeholder="6 weeks · 4 hours/week" /></div>
            <div><label className="label" htmlFor="campusId">Campus reach</label><select className="field" id="campusId" name="campusId"><option value="">All NST campuses</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
            <button className="button button-primary w-full" type="submit">Publish open call</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
