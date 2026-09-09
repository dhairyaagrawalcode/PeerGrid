"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft, FiBell, FiBookmark, FiHelpCircle, FiLogOut, FiMessageSquare, FiPlus, FiSettings, FiUsers, FiX } from "react-icons/fi";
import { signOut } from "@/app/actions/auth";
import { mobilePage } from "@/app/lib/mobile-layout";
import Brand from "./brand";

export default function MobilePageHeader({ notifications = 0, messages = 0, loading = false }: { notifications?: number; messages?: number; loading?: boolean }) {
  const path = usePathname();
  const page = mobilePage(path);
  const settings = useRef<HTMLDialogElement>(null);
  if (page.immersive) return null;
  const close = () => settings.current?.close();
  return <header className="mobile-page-header">
    <div className="mobile-page-header-inner">
      {path === "/feed" ? <><Brand href="/feed" /><h1 className="sr-only">Home</h1></> : <>
        <Link className="mobile-icon-button" aria-label={path === "/post" ? "Close composer" : "Back"} href={page.back!} transitionTypes={["nav-back"]}>{path === "/post" ? <FiX /> : <FiArrowLeft />}</Link>
        {path === "/profile" || path.startsWith("/students/") ? <strong className="mobile-page-title">{page.title}</strong> : <h1>{page.title}</h1>}
      </>}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {path === "/feed" && <>
          <Link aria-label={`Messages${messages ? `, ${messages} unread` : ""}`} className="mobile-icon-button relative" href="/messages" transitionTypes={["nav-forward"]}><FiMessageSquare />{messages > 0 && <span className="mobile-unread-dot" />}</Link>
          <Link aria-label={`Notifications${notifications ? `, ${notifications} unread` : ""}`} className="mobile-icon-button relative" href="/notifications" transitionTypes={["nav-forward"]}><FiBell />{notifications > 0 && <span className="mobile-unread-dot" />}</Link>
        </>}
        {path === "/collaborate" && <Link className="mobile-icon-button" aria-label="Create collaboration" href="/collaborate/new" transitionTypes={["nav-forward"]}><FiPlus /></Link>}
        {path === "/profile" && <button className="mobile-icon-button" aria-label="Settings" aria-haspopup="dialog" disabled={loading} onClick={() => settings.current?.showModal()} type="button"><FiSettings /></button>}
      </div>
    </div>
    <dialog className="mobile-settings-sheet" aria-labelledby="mobile-settings-title" ref={settings} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="flex items-center justify-between border-b border-line pb-3"><h2 className="text-lg font-bold" id="mobile-settings-title">Settings</h2><button aria-label="Close settings" className="mobile-icon-button" onClick={close} type="button"><FiX /></button></div>
      <nav aria-label="Account settings" onClick={close}>
        <Link href="/profile/edit" transitionTypes={["nav-forward"]}><FiSettings /> Edit profile</Link>
        <Link href="/saved" transitionTypes={["nav-forward"]}><FiBookmark /> Saved posts</Link>
        <Link href="/connections"><FiUsers /> Followers &amp; following</Link>
        <Link href="/notifications"><FiBell /> Notifications</Link>
        <Link href={`/report-problem?from=${encodeURIComponent(path)}`}><FiHelpCircle /> Report a problem</Link>
      </nav>
      <form action={signOut}><button className="flex min-h-12 w-full items-center gap-3 text-danger" type="submit"><FiLogOut /> Sign out</button></form>
    </dialog>
  </header>;
}
