"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function CollaborationSeenTracker() {
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    void supabase.rpc("mark_collaboration_activity_seen").then(() => {
      window.dispatchEvent(new CustomEvent("peergrid:collaboration-seen"));
    });
  }, [supabase]);
  return null;
}
