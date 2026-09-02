"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiLoader, FiSearch, FiUsers, FiX } from "react-icons/fi";
import { SEARCH_PAGE_SIZE } from "@/app/lib/data";
import { createClient } from "@/app/lib/supabase/client";
import type { MutualFollowContext, StudentProfile } from "@/app/types";
import EmptyState from "./empty-state";
import StudentResult from "./student-result";

export default function DiscoverSearch({
  initialStudents,
  currentId,
  initialFollowingIds,
  initialHasMore,
  initialMutualContexts,
}: {
  initialStudents: StudentProfile[];
  currentId: string;
  initialFollowingIds: string[];
  initialHasMore: boolean;
  initialMutualContexts: Record<string, MutualFollowContext>;
}) {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState(initialStudents);
  const [followingIds, setFollowingIds] = useState(initialFollowingIds);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [mutualContexts, setMutualContexts] = useState(initialMutualContexts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const supabase = useMemo(() => createClient(), []);
  const following = useMemo(() => new Set(followingIds), [followingIds]);

  async function runSearch(value: string, offset = 0) {
    const currentRequest = ++requestId.current;
    const { data, error: searchError } = await supabase.rpc(
      "search_student_profiles",
      {
        search_text: value.trim().slice(0, 120),
        result_limit: SEARCH_PAGE_SIZE + 1,
        result_offset: offset,
      },
    );
    if (currentRequest !== requestId.current) return false;
    if (searchError) {
      setError("Search is temporarily unavailable. Please try again.");
      return true;
    }
    const rows = (data ?? []) as Array<StudentProfile & { viewer_follows: boolean }>;
    const page = rows.slice(0, SEARCH_PAGE_SIZE);
    const { data: mutualRows } = await supabase.rpc("get_mutual_follow_contexts", { candidate_profile_ids: page.map((student) => student.id) });
    if (currentRequest !== requestId.current) return false;
    const pageMutuals = Object.fromEntries(((mutualRows ?? []) as Array<{ profile_id: string; mutual_count: number | string; mutual_names: string[] | null }>).map((row) => [row.profile_id, {
      profile_id: row.profile_id,
      mutual_count: Number(row.mutual_count ?? 0),
      mutual_names: row.mutual_names ?? [],
    } satisfies MutualFollowContext]));
    setStudents((current) => (offset ? [...current, ...page] : page));
    setMutualContexts((current) => offset ? { ...current, ...pageMutuals } : pageMutuals);
    setFollowingIds((current) => {
      const next = new Set(offset ? current : []);
      page.forEach((student) => {
        if (student.viewer_follows) next.add(student.id);
      });
      return [...next];
    });
    setHasMore(rows.length > SEARCH_PAGE_SIZE);
    setError(null);
    return true;
  }

  function updateQuery(value: string) {
    requestId.current += 1;
    setQuery(value);
    setError(null);
    if (!value.trim()) {
      setStudents(initialStudents);
      setFollowingIds(initialFollowingIds);
      setHasMore(initialHasMore);
      setMutualContexts(initialMutualContexts);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!query.trim()) return;
    const timer = window.setTimeout(() => {
      void runSearch(query).then((current) => {
        if (current) setLoading(false);
      });
    }, 300);
    return () => window.clearTimeout(timer);
    // Initial props are stable for the lifetime of this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, supabase]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await runSearch(query, students.length);
    setLoadingMore(false);
  }

  return (
    <section className="mt-7">
      <div className="relative w-full">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          aria-label="Search students"
          autoComplete="off"
          autoFocus
          className="field !min-h-12 !rounded-full !bg-panel !pl-11 !pr-11"
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search people, campuses, batches, skills, or interests"
          type="search"
          value={query}
        />
        {query && (
          <button
            aria-label="Clear search"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-card hover:text-font"
            onClick={() => updateQuery("")}
            type="button"
          >
            <FiX />
          </button>
        )}
      </div>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold">People</h2>
          <p aria-live="polite" className="mt-0.5 text-xs text-muted">{students.length} result{students.length === 1 ? "" : "s"}{hasMore ? "+" : ""}</p>
        </div>
        {loading && <span className="flex items-center gap-1.5 text-xs text-muted"><FiLoader className="animate-spin" /> Searching</span>}
      </div>

      {students.length ? (
        <div className="mt-2 divide-y divide-line">
          {students.map((student) => (
            <StudentResult key={student.id} student={student} currentId={currentId} isFollowing={following.has(student.id)} mutualContext={mutualContexts[student.id]} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<FiUsers size={20} />} title="No students found" copy="Try a name, username, campus, graduation year, skill, or interest." />
      )}
      {hasMore && !loading && (
        <div className="flex justify-center py-5">
          <button className="button button-secondary !min-h-9 !text-xs" disabled={loadingMore} onClick={loadMore} type="button">
            {loadingMore ? <><FiLoader className="animate-spin" /> Loading</> : "Show more students"}
          </button>
        </div>
      )}
      {error && <p className="py-4 text-sm text-danger" role="alert">{error}</p>}
    </section>
  );
}
