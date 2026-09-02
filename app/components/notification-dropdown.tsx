"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { useNotifications } from "@/app/lib/use-notifications";
import { timeAgo } from "@/app/lib/format";
import { notificationPresentation } from "@/app/lib/notifications";
import type { PeerGridNotification } from "@/app/types";

export default function NotificationDropdown({ count, initialNotifications, active }: {
  count: number;
  initialNotifications: PeerGridNotification[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { notifications, busy, error, refresh, clear, markRead } = useNotifications(initialNotifications, 8);
  const menuRef = useRef<HTMLDivElement>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    await refresh();
  }

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
      <div className="flex gap-4 px-4 pb-3 text-xs"><button className="text-muted hover:text-font disabled:opacity-40" disabled={busy || !count} onClick={() => void markRead()} type="button">Mark all as read</button><button className="ml-auto text-muted hover:text-font disabled:opacity-40" disabled={busy || !notifications.length} onClick={() => void clear()} type="button">Clear all</button></div>
      {error && <p className="px-4 pb-3 text-xs text-danger" role="alert">{error}</p>}
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
