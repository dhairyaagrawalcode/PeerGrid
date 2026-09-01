"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function NotificationSeenTracker() {
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    void supabase.rpc("mark_notifications_read", { notification_ids: null }).then(() => {
      window.dispatchEvent(new CustomEvent("peergrid:notifications-read"));
    });
  }, [supabase]);
  return null;
}
