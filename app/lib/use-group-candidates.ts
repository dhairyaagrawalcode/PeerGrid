"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "./supabase/client";
import type { StudentProfile } from "../types";

export type GroupCandidate = Pick<StudentProfile, "id" | "username" | "full_name" | "avatar_url" | "campus">;

/** Fetch the existing bounded picker only when it is actually opened. No bios/tags. */
export function useGroupCandidates(open: boolean, currentId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [students, setStudents] = useState<GroupCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let disposed = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: queryError } = await supabase.from("profiles")
          .select("id, username, full_name, avatar_url, campus:campuses(id, slug, name, city)")
          .eq("is_verified", true).neq("id", currentId).order("full_name").limit(100)
          .abortSignal(controller.signal);
        if (disposed) return;
        if (queryError) setError("Could not load students. Close and reopen to retry.");
        else setStudents((data ?? []) as unknown as GroupCandidate[]);
      } catch {
        if (!disposed) setError("Could not load students. Close and reopen to retry.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => { disposed = true; controller.abort(); };
  }, [open, currentId, supabase]);
  return { students, loading, error };
}
