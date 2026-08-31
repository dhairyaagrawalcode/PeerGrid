import DiscoverSearch from "@/app/components/discover-search";
import { requireStudent } from "@/app/lib/auth";
import { searchStudents } from "@/app/lib/data";

export default async function DiscoverPage() {
  const { supabase, user } = await requireStudent();
  const initial = await searchStudents(supabase, "");

  return (
    <div className="app-page">
      <header>
        <p className="eyebrow">Discover</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find people</h1>
        <p className="mt-2 text-sm text-muted">Search the verified NST community by name, username, campus, batch, skills, or interests.</p>
      </header>
      <DiscoverSearch
        currentId={user.id}
        initialFollowingIds={initial.followingIds}
        initialHasMore={initial.hasMore}
        initialStudents={initial.students}
      />
    </div>
  );
}
