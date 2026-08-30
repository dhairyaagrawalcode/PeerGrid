import Link from "next/link";
import { FiArrowRight, FiPlus, FiUsers } from "react-icons/fi";
import CollaborationCard from "@/app/components/collaboration-card";
import EmptyState from "@/app/components/empty-state";
import { requireStudent } from "@/app/lib/auth";
import { getCollaborations, getConnections } from "@/app/lib/data";

export default async function FeedPage() {
  const { supabase, user, profile } = await requireStudent();
  const [posts, connections] = await Promise.all([
    getCollaborations(supabase, { limit: 20 }),
    getConnections(supabase, user.id),
  ]);
  const connectionMap = new Map(connections.map((item) => {
    const other = item.requester_id === user.id ? item.recipient_id : item.requester_id;
    return [other, item];
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div className="min-w-0">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="eyebrow">Your grid</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Good to see you, {profile.full_name.split(" ")[0]}</h1><p className="mt-2 text-sm text-muted">Recent collaboration activity across NST.</p></div>
          <Link className="button button-primary hidden sm:inline-flex" href="/collaborate#new"><FiPlus /> Post a need</Link>
        </div>
        <div className="space-y-4">
          {posts.length ? posts.map((post) => <CollaborationCard key={post.id} post={post} currentId={user.id} connection={connectionMap.get(post.author_id)} />) : <EmptyState icon={<FiUsers size={21} />} title="The grid is quiet—for now" copy="Be the first student to share what you are building and who you need." action={<Link className="button button-primary" href="/collaborate#new">Create a collaboration post</Link>} />}
        </div>
      </div>
      <aside className="hidden space-y-4 lg:block">
        <section className="surface p-5"><p className="eyebrow">Campus</p><h2 className="mt-3 font-bold">{profile.campus?.name}</h2><p className="mt-2 text-xs leading-5 text-muted">Explore peers on your campus or open your search to all of NST.</p><Link className="mt-4 flex items-center gap-1 text-xs font-bold text-secondary" href={`/discover?campus=${profile.campus?.slug}`}>Find campus peers <FiArrowRight /></Link></section>
        <section className="surface p-5"><p className="eyebrow">Network</p><p className="mt-3 text-3xl font-black">{connections.filter((item) => item.status === "accepted").length}</p><p className="text-xs text-muted">connections</p><Link className="mt-4 flex items-center gap-1 text-xs font-bold text-primary" href="/connections">Manage connections <FiArrowRight /></Link></section>
      </aside>
    </div>
  );
}

