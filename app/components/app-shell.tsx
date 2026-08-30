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
  { href: "/collaborate", label: "Collaborate", icon: FiPlusCircle },
  { href: "/connections", label: "Connections", icon: FiUsers },
  { href: "/profile", label: "Profile", icon: FiUser },
];

export default function AppShell({ profile, children }: { profile: StudentProfile; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-bg text-font">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-white/6 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand href="/feed" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-xs font-semibold">{profile.full_name}</p><p className="text-[10px] text-muted">{profile.campus?.name}</p></div>
            <Link className="avatar !h-9 !w-9" href="/profile">
              {profile.avatar_url ? <AvatarImage alt={profile.full_name} src={profile.avatar_url} /> : initials(profile.full_name)}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-7 px-4 pb-24 pt-20 sm:px-6 md:pb-8">
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-56 shrink-0 flex-col md:flex">
          <nav className="space-y-1">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${active ? "bg-primary/12 text-primary" : "text-muted hover:bg-white/[0.035] hover:text-font"}`}><Icon size={18} />{label}</Link>;
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/6 bg-white/[0.02] p-4">
            <p className="text-xs font-bold">{profile.campus?.name}</p>
            <p className="mt-1 text-[11px] text-muted">Verified NST student</p>
            <form action={signOut}><button className="mt-4 flex items-center gap-2 text-xs font-semibold text-rose-300" type="submit"><FiLogOut /> Sign out</button></form>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[4.4rem] grid-cols-5 border-t border-white/7 bg-bg/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? "text-primary" : "text-muted"}`}><Icon size={19} /><span>{label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
