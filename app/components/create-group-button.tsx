"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCamera, FiCheck, FiSearch, FiUserPlus, FiUsers, FiX } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";
import { uploadGroupAvatar, validateGroupAvatar } from "@/app/lib/group-avatar";
import { initials } from "@/app/lib/format";
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";

export default function CreateGroupButton({ currentId, students }: { currentId: string; students: StudentProfile[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const filtered = students.filter((student) => `${student.full_name} ${student.username}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);

  function resetForm() {
    setTitle("");
    setQuery("");
    setSelected([]);
    setAvatar(null);
    setError(null);
    setCreating(false);
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    if (creating) return;
    setOpen(false);
    resetForm();
  }

  function toggle(studentId: string) {
    setError(null);
    setSelected((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : current.length < 9 ? [...current, studentId] : current);
  }

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || title.trim().length < 2 || selected.length < 2) return;
    setCreating(true);
    setError(null);
    let avatarPath: string | null = null;
    if (avatar) {
      const validationError = validateGroupAvatar(avatar);
      if (validationError) {
        setError(validationError);
        setCreating(false);
        return;
      }
      try {
        avatarPath = await uploadGroupAvatar(supabase, currentId, avatar);
      } catch {
        setError("The group picture could not be uploaded. Please try again.");
        setCreating(false);
        return;
      }
    }
    const { data, error: createError } = await supabase.rpc("create_group_conversation", {
      candidate_avatar_path: avatarPath,
      candidate_title: title.trim().slice(0, 80),
      candidate_member_ids: selected,
    });
    if (createError || !data) {
      if (avatarPath) await supabase.storage.from("group-avatars").remove([avatarPath]);
      const reason = createError?.message ?? "";
      setError(reason.includes("GROUP_REQUIRES_3_TO_10_MEMBERS")
        ? "Choose at least two verified students."
        : reason.includes("INVALID_GROUP_MEMBER")
          ? "One of the selected students is no longer verified."
          : "The group could not be created. Please try again.");
      setCreating(false);
      return;
    }
    window.dispatchEvent(new CustomEvent("peergrid:message-change"));
    setOpen(false);
    resetForm();
    router.push(`/messages/${String(data)}`);
  }

  return <>
    <button aria-label="Create group" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" onClick={openModal} title="Create group" type="button"><FiUserPlus /></button>
    {open && <div aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} role="dialog">
      <div className="flex max-h-[min(720px,90dvh)] w-full max-w-md flex-col rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between px-5 py-4">
          <div><h2 className="text-base font-bold">New group</h2><p className="mt-1 text-xs text-muted">Choose 2–9 students.</p></div>
          <button aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={creating} onClick={closeModal} type="button"><FiX /></button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={createGroup}>
          <div className="space-y-3 px-5 pb-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:bg-card">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-muted"><FiCamera /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{avatar?.name ?? "Add group picture"}</strong><small className="mt-0.5 block text-[10px] text-muted">Optional · JPG, PNG, or WebP · up to 5 MB</small></span>
              <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                const validationError = file ? validateGroupAvatar(file) : null;
                setAvatar(validationError ? null : file);
                setError(validationError);
                event.target.value = "";
              }} type="file" />
            </label>
            <div><label className="label" htmlFor="group-title">Group name</label><input className="field" id="group-title" maxLength={80} minLength={2} onChange={(event) => { setTitle(event.target.value); setError(null); }} placeholder="Hackathon team" required value={title} /></div>
            <div className="relative"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input aria-label="Search students" className="field !pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Search students" value={query} /></div>
            <p className="text-[11px] text-muted">{selected.length} selected · group will have {selected.length + 1} members</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-y border-line px-3 py-2">
            {filtered.map((student) => {
              const checked = selected.includes(student.id);
              return <button className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${checked ? "bg-primary/10" : "hover:bg-card"}`} key={student.id} onClick={() => toggle(student.id)} type="button">
                <span className="avatar !h-10 !w-10 !rounded-full">{student.avatar_url ? <AvatarImage alt={student.full_name} src={student.avatar_url} /> : initials(student.full_name)}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{student.full_name}</strong><small className="block truncate text-[10px] text-muted">@{student.username} · {student.campus?.name ?? "NST"}</small></span>
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-primary bg-primary text-white" : "border-line text-transparent"}`}><FiCheck size={12} /></span>
              </button>;
            })}
            {!filtered.length && <div className="py-12 text-center text-xs text-muted"><FiUsers className="mx-auto mb-2" size={20} />No students found.</div>}
          </div>
          <div className="p-4"><button className="button button-primary w-full" disabled={creating || title.trim().length < 2 || selected.length < 2} type="submit">{creating ? "Creating…" : "Create group"}</button>{error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}</div>
        </form>
      </div>
    </div>}
  </>;
}
