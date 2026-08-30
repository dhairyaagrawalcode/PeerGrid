import { FiEdit3, FiUsers } from "react-icons/fi";
import CollaborationCard from "@/app/components/collaboration-card";
import EmptyState from "@/app/components/empty-state";
import { createCollaboration } from "@/app/actions/collaborations";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses, getCollaborations, getFollows } from "@/app/lib/data";

export default async function CollaboratePage() {
  const { supabase, user } = await requireStudent();
  const [campuses, posts, follows] = await Promise.all([getCampuses(supabase), getCollaborations(supabase), getFollows(supabase, user.id)]);
  const following = new Set(follows.filter((item) => item.follower_id === user.id).map((item) => item.following_id));
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 xl:order-1">
        <div><p className="eyebrow">Collaboration board</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Build with people, not alone</h1><p className="mt-2 text-sm text-muted">Open calls for hackathons, projects, open source, and startup experiments.</p></div>
        <div className="mt-6 space-y-4">{posts.length ? posts.map((post) => <CollaborationCard key={post.id} post={post} currentId={user.id} isFollowing={following.has(post.author_id)} />) : <EmptyState icon={<FiUsers size={21} />} title="No collaboration posts yet" copy="Share the first open call with students across NST." />}</div>
      </div>
      <aside className="xl:order-2">
        <form action={createCollaboration} className="surface scroll-mt-24 p-5 xl:sticky xl:top-20" id="new">
          <div className="flex items-center gap-2"><FiEdit3 className="text-secondary" /><h2 className="font-bold">Post a collaboration need</h2></div>
          <div className="mt-5 space-y-4">
            <div><label className="label" htmlFor="title">Title</label><input className="field" id="title" name="title" minLength={5} maxLength={100} placeholder="Need 2 students for SIH" required /></div>
            <div><label className="label" htmlFor="description">What are you building?</label><textarea className="field" id="description" name="description" minLength={10} maxLength={1200} placeholder="Share the idea, current progress, and the kind of collaborator you need." required /></div>
            <div><label className="label" htmlFor="tags">Skills / tags</label><input className="field" id="tags" name="tags" placeholder="React, FastAPI, design" /><p className="mt-1.5 text-xs text-muted">Separate with commas.</p></div>
            <div><label className="label" htmlFor="campusId">Campus reach</label><select className="field" id="campusId" name="campusId"><option value="">All NST campuses</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
            <button className="button button-primary w-full" type="submit">Publish open call</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
