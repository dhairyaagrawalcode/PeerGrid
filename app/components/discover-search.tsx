"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiLoader, FiSearch, FiUsers, FiX } from "react-icons/fi";
import { SEARCH_PAGE_SIZE } from "@/app/lib/data";
import { createClient } from "@/app/lib/supabase/client";
import type { MutualFollowContext, StudentProfile } from "@/app/types";
import EmptyState from "./empty-state";
import StudentResult from "./student-result";

type DiscoverFilter = {
  category: "Campus" | "Class" | "Program" | "Skill" | "Interest";
  key: string;
  label: string;
  query: string;
};

export default function DiscoverSearch({
  initialStudents,
  filterProfiles,
  currentId,
  initialFollowingIds,
  initialHasMore,
  initialMutualContexts,
}: {
  initialStudents: StudentProfile[];
  filterProfiles: StudentProfile[];
  currentId: string;
  initialFollowingIds: string[];
  initialHasMore: boolean;
  initialMutualContexts: Record<string, MutualFollowContext>;
}) {
  const [query, setQuery] = useState("");
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
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
  // These options come from a bounded set of verified profiles rather than a hard-coded taxonomy.
  const filters = useMemo(() => {
    const options = new Map<string, DiscoverFilter>();
    const add = (category: DiscoverFilter["category"], value: string | number | null | undefined, label?: string) => {
      const queryValue = String(value ?? "").trim();
      if (!queryValue) return;
      const key = `${category}:${queryValue.toLocaleLowerCase()}`;
      if (!options.has(key)) options.set(key, { category, key, label: label ?? queryValue, query: queryValue });
    };
    filterProfiles.forEach((student) => {
      add("Campus", student.campus?.name);
      add("Class", student.graduation_year, student.graduation_year ? `Class ${student.graduation_year}` : undefined);
      add("Program", student.program);
      student.skills?.forEach((skill) => add("Skill", skill.name));
      student.interests?.forEach((interest) => add("Interest", interest.name));
    });
    return [...options.values()].slice(0, 30);
  }, [filterProfiles]);
  const activeFilter = useMemo(() => filters.find((filter) => filter.key === activeFilterKey) ?? null, [activeFilterKey, filters]);
  const searchValue = useMemo(() => [query.trim(), activeFilter?.query].filter(Boolean).join(" "), [activeFilter, query]);

  function restoreInitialResults() {
    setStudents(initialStudents);
    setFollowingIds(initialFollowingIds);
    setHasMore(initialHasMore);
    setMutualContexts(initialMutualContexts);
    setLoading(false);
  }

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
    if (!value.trim() && !activeFilter) restoreInitialResults();
    else setLoading(true);
  }

  function updateFilter(key: string | null) {
    requestId.current += 1;
    const nextKey = activeFilterKey === key ? null : key;
    setActiveFilterKey(nextKey);
    setError(null);
    if (!query.trim() && !nextKey) restoreInitialResults();
    else setLoading(true);
  }

  useEffect(() => {
    if (!searchValue) return;
    const timer = window.setTimeout(() => {
      void runSearch(searchValue).then((current) => {
        if (current) setLoading(false);
      });
    }, 300);
    return () => window.clearTimeout(timer);
    // Initial props are stable for the lifetime of this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, supabase]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await runSearch(searchValue, students.length);
    setLoadingMore(false);
  }

  return (
    <section className="discover-search mt-7">
      <div className="relative w-full">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          aria-label="Search students"
          autoComplete="off"
          className="field !min-h-12 !rounded-full !bg-panel !pl-11 !pr-11"
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search people, campuses, batches, skills, or interests"
          inputMode="search"
          type="text"
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

      <div className="discover-chips flex gap-2 overflow-x-auto py-3" aria-label="Filters from student profiles">
        <button aria-pressed={!activeFilterKey} className="chip shrink-0" onClick={() => updateFilter(null)} type="button">All</button>
        {filters.map((filter) => <button aria-label={`Filter by ${filter.category}: ${filter.label}`} aria-pressed={activeFilterKey === filter.key} className="chip shrink-0" key={filter.key} onClick={() => updateFilter(filter.key)} title={filter.category} type="button">{filter.label}</button>)}
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
