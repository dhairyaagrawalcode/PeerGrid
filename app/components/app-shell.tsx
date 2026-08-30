"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import Brand from "./brand";

const navigation = [
  { href: "/feed", label: "Home", icon: FiGrid },
  { href: "/discover", label: "Discover", icon: FiSearch },
  { href: "/collaborate", label: "Collaborate", icon: FiUsers },
  { href: "/post", label: "Post", icon: FiPlusSquare },
  { href: "/messages", label: "Messages", icon: FiMessageSquare },
];

export default function AppShell({
  profile,
  initialUnreadCount,
  children,
}: {
  profile: StudentProfile;
  initialUnreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`navigation-messages:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (payload.new.sender_id !== profile.id) {
            setUnreadCount((count) => count + 1);
          }
        },
      )
      .subscribe();

    function messagesRead(event: Event) {
      const count = Number((event as CustomEvent<number>).detail ?? 0);
      setUnreadCount((current) => Math.max(0, current - count));
    }
    window.addEventListener("peergrid:messages-read", messagesRead);
    return () => {
      window.removeEventListener("peergrid:messages-read", messagesRead);
      void supabase.removeChannel(channel);
    };
  }, [profile.id, supabase]);

  function navigationLink({
    href,
    label,
    icon: Icon,
    mobile = false,
  }: (typeof navigation)[number] & { mobile?: boolean }) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const count = label === "Messages" ? unreadCount : 0;
    return (
      <Link
        aria-label={label}
        className={
          mobile
            ? `relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-primary" : "text-muted"}`
            : `relative grid h-10 w-10 place-items-center rounded-xl transition ${active ? "bg-primary/15 text-primary" : "text-muted hover:bg-panel hover:text-font"}`
        }
        href={href}
        key={href}
        title={label}
      >
        <Icon size={mobile ? 19 : 18} />
        {mobile && <span>{label}</span>}
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
      <header className="fixed inset-x-0 top-0 z-40 h-[4.5rem] border-b border-line bg-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1320px] items-center gap-6 px-4 sm:px-6">
          <Brand href="/feed" />

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Application navigation">
            {navigation.map((item) => navigationLink(item))}
          </nav>
          <div className="hidden h-7 w-px bg-line md:block" />

          <details className="group relative">
            <summary
              aria-label="Open account menu"
              className="avatar !h-9 !w-9 !cursor-pointer !rounded-full list-none ring-2 ring-transparent transition hover:ring-primary/40 [&::-webkit-details-marker]:hidden"
            >
              {profile.avatar_url ? (
                <AvatarImage alt={profile.full_name} src={profile.avatar_url} />
              ) : (
                initials(profile.full_name)
              )}
            </summary>
            <div className="absolute right-0 top-12 w-60 rounded-xl border border-line bg-panel p-2">
              <div className="border-b border-line px-3 py-2.5">
                <p className="truncate text-sm font-bold">{profile.full_name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">@{profile.username}</p>
              </div>
              <Link className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card hover:text-font" href="/profile">
                <FiUser /> View profile
              </Link>
              <Link className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card hover:text-font" href="/connections">
                <FiUsers /> Followers &amp; following
              </Link>
              <form action={signOut} className="mt-1 border-t border-line pt-1">
                <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger/10" type="submit">
                  <FiLogOut /> Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto h-dvh max-w-[1320px] overflow-y-auto overscroll-contain px-4 pb-24 pt-[5.5rem] [scrollbar-gutter:stable] sm:px-6 md:pb-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[4.4rem] grid-cols-5 border-t border-line bg-bg/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {navigation.map((item) => navigationLink({ ...item, mobile: true }))}
      </nav>
    </div>
  );
}
