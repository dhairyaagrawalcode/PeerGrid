"use client";

import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiUsers, FiX } from "react-icons/fi";
import type { StudentProfile } from "@/app/types";
import EmptyState from "./empty-state";
import StudentResult from "./student-result";

function searchableProfile(student: StudentProfile) {
  return [
    student.id,
    student.full_name,
    student.username,
    student.campus?.name,
    student.campus?.city,
    student.campus?.slug,
    student.graduation_year,
    student.program,
    ...(student.skills?.map((item) => item.name) ?? []),
    ...(student.interests?.map((item) => item.name) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function DiscoverSearch({
  students,
  currentId,
  followingIds,
}: {
  students: StudentProfile[];
  currentId: string;
  followingIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const following = useMemo(() => new Set(followingIds), [followingIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    const terms = debouncedQuery
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
      .split(/\s+/)
      .filter(Boolean);
    if (!terms.length) return students;
    return students.filter((student) => {
      const searchable = searchableProfile(student);
      return terms.every((term) => searchable.includes(term));
    });
  }, [debouncedQuery, students]);

  return (
    <section className="mt-7">
      <div className="relative w-full">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          aria-label="Search students"
          autoComplete="off"
          autoFocus
          className="field !min-h-12 !rounded-full !bg-panel !pl-11 !pr-11"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people, campuses, batches, skills, or interests"
          type="search"
          value={query}
        />
        {query && (
          <button
            aria-label="Clear search"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-card hover:text-font"
            onClick={() => setQuery("")}
            type="button"
          >
            <FiX />
          </button>
        )}
      </div>

      <div className="mt-7 flex items-end justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-sm font-bold">People</h2>
          <p aria-live="polite" className="mt-0.5 text-xs text-muted">{results.length} result{results.length === 1 ? "" : "s"}</p>
        </div>
        {query !== debouncedQuery && <span className="text-xs text-muted">Searching…</span>}
      </div>

      {results.length ? (
        <div className="divide-y divide-line border-b border-line">
          {results.map((student) => (
            <StudentResult key={student.id} student={student} currentId={currentId} isFollowing={following.has(student.id)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<FiUsers size={20} />} title="No students found" copy="Try a name, username, campus, graduation year, skill, or interest." />
      )}
    </section>
  );
}
