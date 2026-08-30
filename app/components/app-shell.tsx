"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCompass, FiGrid, FiLogOut, FiPlusCircle, FiUser, FiUsers } from "react-icons/fi";
import { signOut } from "@/app/actions/auth";
import { initials } from "@/app/lib/format";
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import Brand from "./brand";

const navigation = [
  { href: "/feed", label: "Home", icon: FiGrid },
  { href: "/discover", label: "Discover", icon: FiCompass },
  { href: "/post", label: "Post", icon: FiPlusCircle },
  { href: "/profile", label: "Profile", icon: FiUser },
];

export default function AppShell({ profile, children }: { profile: StudentProfile; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="h-dvh overflow-hidden bg-bg text-font">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-white/6 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand href="/feed" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-xs font-semibold">{profile.full_name}</p><p className="text-[10px] text-muted">{profile.campus?.name}</p></div>
            <details className="group relative">
              <summary aria-label="Open account menu" className="avatar !h-9 !w-9 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                {profile.avatar_url ? <AvatarImage alt={profile.full_name} src={profile.avatar_url} /> : initials(profile.full_name)}
              </summary>
              <div className="surface absolute right-0 top-12 w-60 !rounded-xl !bg-panel p-2 shadow-2xl shadow-black/50">
                <div className="border-b border-white/7 px-3 py-2.5"><p className="truncate text-sm font-bold">{profile.full_name}</p><p className="mt-0.5 truncate text-xs text-muted">@{profile.username}</p></div>
                <Link className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-white/5 hover:text-font" href="/profile"><FiUser /> View profile</Link>
                <Link className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted hover:bg-white/5 hover:text-font" href="/connections"><FiUsers /> Followers &amp; following</Link>
                <form action={signOut} className="mt-1 border-t border-white/7 pt-1"><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-300 hover:bg-rose-400/8" type="submit"><FiLogOut /> Sign out</button></form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="mx-auto flex h-dvh max-w-6xl gap-7 overflow-hidden px-4 pt-16 sm:px-6">
        <aside className="hidden h-full w-56 shrink-0 flex-col py-4 md:flex">
          <nav className="space-y-1">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${active ? "bg-primary/12 text-primary" : "text-muted hover:bg-white/[0.035] hover:text-font"}`}><Icon size={18} />{label}</Link>;
            })}
          </nav>
          <div className="mb-4 mt-auto rounded-2xl border border-white/6 bg-white/[0.02] p-4">
            <p className="text-xs font-bold">{profile.campus?.name}</p>
            <p className="mt-1 text-[11px] text-muted">Verified NST student</p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain pb-24 pt-4 [scrollbar-gutter:stable] md:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[4.4rem] grid-cols-4 border-t border-white/7 bg-bg/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-primary" : "text-muted"}`}><Icon size={19} /><span>{label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
