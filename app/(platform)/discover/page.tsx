import DiscoverSearch from "@/app/components/discover-search";
import { requireStudent } from "@/app/lib/auth";
import { getFollows, getStudents } from "@/app/lib/data";

export default async function DiscoverPage() {
  const { supabase, user } = await requireStudent();
  const [students, follows] = await Promise.all([
    getStudents(supabase, user.id),
    getFollows(supabase, user.id),
  ]);
  const followingIds = follows
    .filter((item) => item.follower_id === user.id)
    .map((item) => item.following_id);

  return (
    <div className="app-page">
      <header>
        <p className="eyebrow">Discover</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find people</h1>
        <p className="mt-2 text-sm text-muted">Search the verified NST community by name, username, campus, batch, skills, or interests.</p>
      </header>
      <DiscoverSearch currentId={user.id} followingIds={followingIds} students={students} />
    </div>
  );
}
