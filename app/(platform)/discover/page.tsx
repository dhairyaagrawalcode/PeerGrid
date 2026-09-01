import DiscoverSearch from "@/app/components/discover-search";
import SuggestedStudent from "@/app/components/suggested-student";
import { requireStudent } from "@/app/lib/auth";
import { getProfileMatches, searchStudents } from "@/app/lib/data";

export default async function DiscoverPage() {
  const { supabase, user } = await requireStudent();
  const [initial, matches] = await Promise.all([
    searchStudents(supabase, ""),
    getProfileMatches(supabase, 4),
  ]);

  return (
    <div className="app-page">
      <header>
        <p className="eyebrow">Discover</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find people</h1>
        <p className="mt-2 text-sm text-muted">Search the verified NST community by name, username, campus, batch, skills, or interests.</p>
      </header>
      {!!matches.length && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-bold">People you should meet</h2>
            <p className="text-xs text-muted">Based on what you build and can help with</p>
          </div>
          <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
            {matches.map(({ student, reason }) => (
              <SuggestedStudent currentId={user.id} isFollowing={false} key={student.id} reason={reason} student={student} />
            ))}
          </div>
        </section>
      )}
      <DiscoverSearch
        currentId={user.id}
        initialFollowingIds={initial.followingIds}
        initialHasMore={initial.hasMore}
        initialStudents={initial.students}
      />
    </div>
  );
}
