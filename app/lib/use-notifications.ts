"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import type { PeerGridNotification } from "../types";

export const notificationSelect = "id, type, collaboration_id, passport_id, post_id, conversation_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url), collaboration:collaboration_posts!notifications_collaboration_id_fkey(id, title), passport:collaboration_passports!notifications_passport_id_fkey(id, project_name), post:social_posts!notifications_post_id_fkey(id, body), conversation:conversations!notifications_conversation_id_fkey(id, title)";

export function useNotifications(initial: PeerGridNotification[], limit: number, enabled = true) {
  const [notifications, setNotifications] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const revision = useRef(0);
  const mutation = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++revision.current;
    const { data } = await supabase.from("notifications").select(notificationSelect).is("cleared_at", null).order("created_at", { ascending: false }).limit(limit);
    if (data && version === revision.current) setNotifications(data as unknown as PeerGridNotification[]);
  }, [limit, supabase]);
  useEffect(() => {
    if (!enabled) return;
    const revisionRef = revision;
    const update = () => { void refresh(); };
    const changed = (event: Event) => {
      revisionRef.current++;
      const kind = (event as CustomEvent<string>).detail;
      if (kind === "cleared") setNotifications([]);
      else if (kind === "read") setNotifications(current => current.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      void refresh();
    };
    window.addEventListener("peergrid:notification-change", update);
    window.addEventListener("peergrid:notifications-updated", changed);
    return () => {
      revisionRef.current++;
      window.removeEventListener("peergrid:notification-change", update);
      window.removeEventListener("peergrid:notifications-updated", changed);
    };
  }, [refresh, enabled]);
  async function act(kind: "cleared" | "read") {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError("");
    try {
      const { error: rpcError } = kind === "cleared"
        ? await supabase.rpc("clear_notifications")
        : await supabase.rpc("mark_notifications_read", { notification_ids: null });
      if (rpcError) { setError("Notifications could not be updated. Please try again."); return; }
      // A local event synchronizes the dropdown, full page, and badge immediately.
      // A refetch reconciles notifications arriving concurrently with the action.
      window.dispatchEvent(new CustomEvent("peergrid:notifications-updated", { detail: kind }));
    } catch { setError("Notifications could not be updated. Please try again."); }
    finally { mutation.current = false; setBusy(false); }
  }
  return { notifications, busy, error, refresh, clear: () => act("cleared"), markRead: () => act("read") };
}
