"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiBell,
  FiHelpCircle,
  FiGrid,
  FiLogOut,
  FiMessageSquare,
  FiPlusSquare,
  FiSearch,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/app/lib/supabase/client";
import { initials } from "@/app/lib/format";
import type { PeerGridNotification, StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import Brand from "./brand";
import CryptoDeviceBootstrap from "./crypto-device-bootstrap";
import NotificationDropdown from "./notification-dropdown";
import ActivityTracker from "./activity-tracker";

const navigation = [
  { href: "/feed", label: "Home", icon: FiGrid },
  { href: "/discover", label: "Discover", icon: FiSearch },
  { href: "/collaborate", label: "Collaborate", icon: FiUsers },
  { href: "/post", label: "Post", icon: FiPlusSquare },
  { href: "/messages", label: "Messages", icon: FiMessageSquare },
  { href: "/notifications", label: "Notifications", icon: FiBell },
];

function AccountMenu({ profile }: { profile: StudentProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [open]);

  return (
    <div className="relative ml-auto shrink-0 md:ml-0" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="avatar !h-9 !w-9 !cursor-pointer !rounded-full ring-2 ring-transparent transition hover:ring-primary/40"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {profile.avatar_url ? (
          <AvatarImage alt={profile.full_name} src={profile.avatar_url} />
        ) : (
          initials(profile.full_name)
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 max-h-[calc(100dvh-6rem)] w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-panel p-2" role="menu">
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-bold">{profile.full_name}</p>
            <p className="mt-0.5 truncate text-xs text-muted">@{profile.username}</p>
          </div>
          <Link className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card hover:text-font" href="/profile" role="menuitem">
            <FiUser /> View profile
          </Link>
          <Link className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card hover:text-font" href="/connections" role="menuitem">
            <FiUsers /> Followers &amp; following
          </Link>
          <Link className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card hover:text-font" href={`/report-problem?from=${encodeURIComponent(pathname)}`} role="menuitem">
            <FiHelpCircle /> Report a problem
          </Link>
          <form action={signOut} className="mt-1 border-t border-line pt-1">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger/10" role="menuitem" type="submit">
              <FiLogOut /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AppShell({
  profile,
  initialUnreadCount = 0,
  initialCollaborationUnreadCount = 0,
  initialNotificationUnreadCount = 0,
  initialNotifications = [],
  children,
}: {
  profile: StudentProfile;
  initialUnreadCount?: number;
  initialCollaborationUnreadCount?: number;
  initialNotificationUnreadCount?: number;
  initialNotifications?: PeerGridNotification[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [collaborationUnreadCount, setCollaborationUnreadCount] = useState(initialCollaborationUnreadCount);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(initialNotificationUnreadCount);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let notificationTimer: ReturnType<typeof setTimeout> | undefined;
    let notificationRevision = 0;
    let disposed = false;
    let countRevision = 0;
    let countTimer: ReturnType<typeof setTimeout> | undefined;
    async function refreshCounts() {
      const revision = ++countRevision;
      const [messages, collaborations] = await Promise.all([
        supabase.rpc("get_unread_message_count"),
        supabase.rpc("get_unread_collaboration_count"),
      ]);
      if (disposed || revision !== countRevision) return;
      if (!messages.error) setUnreadCount(Number(messages.data ?? 0));
      if (!collaborations.error) setCollaborationUnreadCount(Number(collaborations.data ?? 0));
    }
    function scheduleCounts() {
      countRevision++;
      clearTimeout(countTimer);
      countTimer = setTimeout(() => void refreshCounts(), 150);
    }
    // Non-critical badges no longer hold up the server-rendered page. Reconcile
    // on reconnect/focus as well as events so missed events cannot leave stale counts.
    function reconcile() {
      if (document.visibilityState !== "visible") return;
      scheduleCounts();
      void refreshNotificationCount();
    }
    document.addEventListener("visibilitychange", reconcile);
    window.addEventListener("online", reconcile);
    void refreshCounts();
    void refreshNotificationCount();
    async function refreshNotificationCount() {
      const revision = ++notificationRevision;
      const { data, error } = await supabase.rpc("get_unread_notification_count");
      if (!disposed && revision === notificationRevision && !error) setNotificationUnreadCount(Number(data ?? 0));
    }
    function notificationChanged() {
      // A clear-all operation may produce many row updates. Reconcile once per burst.
      clearTimeout(notificationTimer);
      notificationRevision++;
      notificationTimer = setTimeout(() => {
        void refreshNotificationCount();
        window.dispatchEvent(new CustomEvent("peergrid:notification-change"));
      }, 150);
    }
    const messageChannel = supabase
      .channel(`navigation-messages:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (payload.new.sender_id !== profile.id) {
            setUnreadCount((count) => count + 1);
          }
          window.dispatchEvent(new CustomEvent("peergrid:message-change"));
          scheduleCounts();
        },
      )
      .subscribe((status) => { if (status === "SUBSCRIBED") scheduleCounts(); });

    const collaborationChannel = supabase
      .channel(`navigation-collaborations:${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "collaboration_activity_events" }, () => {
        scheduleCounts();
      })
      .subscribe();

    const notificationChannel = supabase
      .channel(`navigation-notifications:${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${profile.id}` }, notificationChanged)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${profile.id}` }, notificationChanged)
      .subscribe();

    function messagesRead(event: Event) {
      const count = Number((event as CustomEvent<number>).detail ?? 0);
      setUnreadCount((current) => Math.max(0, current - count));
      scheduleCounts();
    }
    window.addEventListener("peergrid:messages-read", messagesRead);
    const collaborationsSeen = () => { setCollaborationUnreadCount(0); scheduleCounts(); };
    const notificationsRead = () => setNotificationUnreadCount(0);
    const notificationsUpdated = () => {
      setNotificationUnreadCount(0);
      void refreshNotificationCount();
    };
    window.addEventListener("peergrid:collaboration-seen", collaborationsSeen);
    window.addEventListener("peergrid:notifications-read", notificationsRead);
    window.addEventListener("peergrid:notifications-updated", notificationsUpdated);
    return () => {
      disposed = true;
      clearTimeout(notificationTimer);
      clearTimeout(countTimer);
      document.removeEventListener("visibilitychange", reconcile);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("peergrid:messages-read", messagesRead);
      window.removeEventListener("peergrid:collaboration-seen", collaborationsSeen);
      window.removeEventListener("peergrid:notifications-read", notificationsRead);
      window.removeEventListener("peergrid:notifications-updated", notificationsUpdated);
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(collaborationChannel);
      void supabase.removeChannel(notificationChannel);
    };
  }, [profile.id, supabase]);

  function navigationLink({
    href,
    label,
    icon: Icon,
    mobile = false,
  }: (typeof navigation)[number] & { mobile?: boolean }) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const count = label === "Messages"
      ? unreadCount
      : label === "Collaborate"
        ? collaborationUnreadCount
        : label === "Notifications"
          ? notificationUnreadCount
          : 0;
    if (label === "Notifications" && !mobile) {
      return <NotificationDropdown active={active} count={notificationUnreadCount} initialNotifications={initialNotifications} key={href} />;
    }
    return (
      <Link
        aria-label={label}
        className={
          mobile
            ? `relative flex min-w-0 flex-col items-center justify-center gap-1 text-[clamp(8px,2.3vw,10px)] font-semibold ${active ? "text-primary" : "text-muted"}`
            : `relative grid h-10 w-10 place-items-center rounded-xl transition ${active ? "bg-primary/15 text-primary" : "text-muted hover:bg-panel hover:text-font"}`
        }
        href={href}
        key={href}
        title={label}
      >
        <Icon size={mobile ? 19 : 18} />
        {mobile && <span className="max-w-full whitespace-nowrap">{label}</span>}
        {count > 0 && (
          <span className={`absolute grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[8px] font-bold leading-4 text-white ${mobile ? "right-[21%] top-2" : "-right-1 -top-1"}`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-bg text-font">
      <ActivityTracker />
      <CryptoDeviceBootstrap userId={profile.id} />
      <header className="fixed inset-x-0 top-0 z-40 h-[4.5rem] border-b border-line bg-bg/95 backdrop-blur-xl">
        <div className="app-frame flex h-full items-center gap-6">
          <Brand href="/feed" />

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Application navigation">
            {navigation.map((item) => navigationLink(item))}
          </nav>
          <div className="hidden h-7 w-px bg-line md:block" />

          <AccountMenu key={pathname} profile={profile} />
        </div>
      </header>

      <main className="app-frame app-main">
        {children}
      </main>

      <nav aria-label="Mobile navigation" className="mobile-navigation fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-bg/95 px-1 backdrop-blur-xl md:hidden">
        {navigation.map((item) => navigationLink({ ...item, mobile: true }))}
      </nav>
    </div>
  );
}
