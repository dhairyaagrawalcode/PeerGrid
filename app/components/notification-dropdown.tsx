"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";
import { timeAgo } from "@/app/lib/format";
import { notificationPresentation } from "@/app/lib/notifications";
import type { PeerGridNotification } from "@/app/types";

const notificationSelect = "id, type, collaboration_id, passport_id, post_id, conversation_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url), collaboration:collaboration_posts!notifications_collaboration_id_fkey(id, title), passport:collaboration_passports!notifications_passport_id_fkey(id, project_name), post:social_posts!notifications_post_id_fkey(id, body), conversation:conversations!notifications_conversation_id_fkey(id, title)";

export default function NotificationDropdown({ count, initialNotifications, onRead, active }: {
  count: number;
  initialNotifications: PeerGridNotification[];
  onRead: () => void;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  async function refresh() {
    const { data } = await supabase.from("notifications").select(notificationSelect).order("created_at", { ascending: false }).limit(8);
    if (data) setNotifications(data as unknown as PeerGridNotification[]);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    await refresh();
    if (count > 0) {
      await supabase.rpc("mark_notifications_read", { notification_ids: null });
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? readAt })));
      onRead();
    }
  }

  useEffect(() => {
    const update = () => { void refresh(); };
    window.addEventListener("peergrid:notification-change", update);
    return () => window.removeEventListener("peergrid:notification-change", update);
  });

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return <div className="relative" ref={menuRef}>
    <button aria-expanded={open} aria-haspopup="menu" aria-label="Notifications" className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${active ? "bg-primary/15 text-primary" : "text-muted hover:bg-panel hover:text-font"}`} onClick={toggle} title="Notifications" type="button">
      <FiBell size={18} />
      {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-bold leading-4 text-white">{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl" role="menu">
      <div className="flex items-center justify-between px-4 py-3"><h2 className="text-sm font-bold">Notifications</h2><Link className="text-[10px] font-bold text-primary" href="/notifications" onClick={() => setOpen(false)}>View all</Link></div>
      <div className="max-h-[440px] overflow-y-auto border-t border-line">
        {notifications.length ? notifications.map((notification) => {
          const presentation = notificationPresentation(notification);
          return <Link className="flex gap-3 px-4 py-3.5 hover:bg-card" href={presentation.href} key={notification.id} onClick={() => setOpen(false)} role="menuitem">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-line" : "bg-primary"}`} />
            <span className="min-w-0"><span className="line-clamp-2 text-xs leading-5 text-subtle">{presentation.message}</span><span className="mt-1 block text-[9px] text-muted">{timeAgo(notification.created_at)}</span></span>
          </Link>;
        }) : <p className="px-4 py-10 text-center text-xs text-muted">No notifications yet.</p>}
      </div>
    </div>}
  </div>;
}
