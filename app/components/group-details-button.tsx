"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCamera, FiCheck, FiChevronDown, FiLoader, FiSearch, FiUserMinus, FiUserPlus, FiUsers, FiX } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";
import { groupAvatarUrl, uploadGroupAvatar, validateGroupAvatar } from "@/app/lib/group-avatar";
import { initials } from "@/app/lib/format";
import type { ConversationMember, StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import ConfirmationModal from "./confirmation-modal";

export default function GroupDetailsButton({ avatarPath: initialAvatarPath, candidates, conversationId, currentId, members: initialMembers, title }: {
  avatarPath: string | null;
  candidates: StudentProfile[];
  conversationId: string;
  currentId: string;
  members: ConversationMember[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ConversationMember | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const owner = members.find((member) => member.role === "owner");
  const canManage = owner?.profile_id === currentId;
  const avatarUrl = groupAvatarUrl(avatarPath);
  const memberIds = useMemo(() => new Set(members.map((member) => member.profile_id)), [members]);
  const availableCandidates = useMemo(() => candidates
    .filter((candidate) => !memberIds.has(candidate.id))
    .filter((candidate) => `${candidate.full_name} ${candidate.username}`.toLowerCase().includes(addQuery.trim().toLowerCase()))
    .slice(0, 30), [addQuery, candidates, memberIds]);
  const remainingSlots = Math.max(10 - members.length, 0);

  function closeModal() {
    if (uploading || removingId || adding) return;
    setOpen(false);
    setError(null);
    setAddMode(false);
    setAddQuery("");
    setSelectedIds([]);
  }

  function toggleCandidate(profileId: string) {
    setError(null);
    setSelectedIds((current) => current.includes(profileId)
      ? current.filter((id) => id !== profileId)
      : current.length < remainingSlots ? [...current, profileId] : current);
  }

  async function addMembers() {
    if (!canManage || !selectedIds.length || adding) return;
    setAdding(true);
    setError(null);
    const { data, error: addError } = await supabase.rpc("add_group_members", {
      candidate_conversation_id: conversationId,
      candidate_member_ids: selectedIds,
    });
    if (addError || Number(data ?? 0) < 1) {
      const reason = addError?.message ?? "";
      setError(reason.includes("GROUP_MEMBER_LIMIT")
        ? "This group can have at most 10 members."
        : reason.includes("INVALID_GROUP_MEMBER")
          ? "One of the selected students is no longer verified."
          : "The selected students could not be added. Please try again.");
    } else {
      const joinedAt = new Date().toISOString();
      const added = candidates
        .filter((candidate) => selectedIds.includes(candidate.id))
        .map((candidate) => ({
          conversation_id: conversationId,
          profile_id: candidate.id,
          role: "member" as const,
          joined_at: joinedAt,
          profile: {
            id: candidate.id,
            username: candidate.username,
            full_name: candidate.full_name,
            avatar_url: candidate.avatar_url,
          },
        }));
      setMembers((current) => [...current, ...added]);
      setSelectedIds([]);
      setAddQuery("");
      setAddMode(false);
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
      router.refresh();
    }
    setAdding(false);
  }

  async function changeAvatar(file: File | undefined) {
    if (!file || uploading || !canManage) return;
    const validationError = validateGroupAvatar(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError(null);
    let newPath: string | null = null;
    try {
      newPath = await uploadGroupAvatar(supabase, currentId, file);
      const { error: updateError } = await supabase.rpc("set_group_avatar", {
        candidate_avatar_path: newPath,
        candidate_conversation_id: conversationId,
      });
      if (updateError) throw updateError;
      const previousPath = avatarPath;
      setAvatarPath(newPath);
      if (previousPath?.startsWith(`${currentId}/`)) {
        await supabase.storage.from("group-avatars").remove([previousPath]);
      }
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
      router.refresh();
    } catch {
      if (newPath) await supabase.storage.from("group-avatars").remove([newPath]);
      setError("The group picture could not be updated. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function removeMember(member: ConversationMember) {
    if (!canManage || member.role === "owner" || removingId) return;
    setRemovingId(member.profile_id);
    setError(null);
    const { data, error: removeError } = await supabase.rpc("remove_group_member", {
      candidate_conversation_id: conversationId,
      candidate_member_id: member.profile_id,
    });
    if (removeError || !data) {
      setError("This member could not be removed. Please try again.");
    } else {
      setMembers((current) => current.filter((item) => item.profile_id !== member.profile_id));
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
      router.refresh();
    }
    setRemovingId(null);
    setMemberToRemove(null);
  }

  return <>
    <button className="flex min-w-0 items-center gap-3 rounded-lg text-left" onClick={() => { setError(null); setOpen(true); }} type="button">
      <span className="avatar !h-10 !w-10 !rounded-full">{avatarUrl ? <AvatarImage alt={title} src={avatarUrl} /> : <FiUsers />}</span>
      <span className="min-w-0"><strong className="block truncate text-sm">{title}</strong><small className="block text-[10px] text-muted">{members.length} members</small></span>
      <FiChevronDown className="shrink-0 text-muted" size={14} />
    </button>

    {open && <div aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} role="dialog">
      <div className="flex max-h-[min(720px,90dvh)] w-full max-w-md flex-col rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between px-5 py-4">
          <div><h2 className="text-base font-bold">Group details</h2><p className="mt-1 text-xs text-muted">{members.length} members</p></div>
          <button aria-label="Close group details" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={uploading || Boolean(removingId) || adding} onClick={closeModal} type="button"><FiX /></button>
        </div>

        <div className="flex items-center gap-4 px-5 pb-5">
          <span className="avatar relative !h-16 !w-16 !rounded-full">{avatarUrl ? <AvatarImage alt={title} src={avatarUrl} /> : <FiUsers size={23} />}</span>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{title}</p></div>
          {canManage && <div className="flex shrink-0 items-center gap-1">
            {remainingSlots > 0 && <button className="button button-ghost !min-h-9 !px-3 !text-xs" onClick={() => { setAddMode((current) => !current); setError(null); }} type="button"><FiUserPlus /> Add members</button>}
            <label className="button button-ghost cursor-pointer !min-h-9 !px-3 !text-xs">
              {uploading ? <FiLoader className="animate-spin" /> : <FiCamera />}<span className="sr-only">{uploading ? "Uploading group picture" : "Change group picture"}</span>
              <input accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(event) => { void changeAvatar(event.target.files?.[0]); event.target.value = ""; }} type="file" />
            </label>
          </div>}
        </div>

        {canManage && addMode && <section className="border-t border-line px-5 py-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Add members</h3><p className="mt-1 text-[11px] text-muted">Choose up to {remainingSlots} verified student{remainingSlots === 1 ? "" : "s"}.</p></div><button aria-label="Close add members" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" onClick={() => { setAddMode(false); setSelectedIds([]); setAddQuery(""); }} type="button"><FiX /></button></div>
          <div className="relative mt-3"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} /><input aria-label="Search students to add" className="field !min-h-10 !pl-9" onChange={(event) => setAddQuery(event.target.value)} placeholder="Search verified students" value={addQuery} /></div>
          <div className="mt-2 max-h-48 overflow-y-auto">
            {availableCandidates.map((candidate) => { const checked = selectedIds.includes(candidate.id); return <button className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${checked ? "bg-primary/10" : "hover:bg-card"}`} key={candidate.id} onClick={() => toggleCandidate(candidate.id)} type="button"><span className="avatar !h-9 !w-9 !rounded-full">{candidate.avatar_url ? <AvatarImage alt={candidate.full_name} src={candidate.avatar_url} /> : initials(candidate.full_name)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{candidate.full_name}</strong><small className="block truncate text-[10px] text-muted">@{candidate.username} · {candidate.campus?.name ?? "NST"}</small></span><span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-primary bg-primary text-white" : "border-line text-transparent"}`}><FiCheck size={12} /></span></button>; })}
            {!availableCandidates.length && <p className="py-6 text-center text-xs text-muted">No students available to add.</p>}
          </div>
          <button className="button button-primary mt-3 w-full !min-h-10 !text-xs" disabled={!selectedIds.length || adding} onClick={() => void addMembers()} type="button">{adding ? <><FiLoader className="animate-spin" />Adding…</> : <><FiUserPlus />Add {selectedIds.length || "members"}</>}</button>
        </section>}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-3 py-2">
          {members.map((member) => <div className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-card" key={member.profile_id}>
            <Link className="flex min-w-0 flex-1 items-center gap-3" href={`/students/${member.profile.username}`}>
              <span className="avatar !h-10 !w-10 !rounded-full">{member.profile.avatar_url ? <AvatarImage alt={member.profile.full_name} src={member.profile.avatar_url} /> : initials(member.profile.full_name)}</span>
              <span className="min-w-0"><strong className="block truncate text-sm">{member.profile.full_name}</strong><small className="block truncate text-[10px] text-muted">@{member.profile.username}{member.role === "owner" ? " · Admin" : ""}</small></span>
            </Link>
            {canManage && member.role !== "owner" && <button aria-label={`Remove ${member.profile.full_name}`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" disabled={Boolean(removingId)} onClick={() => setMemberToRemove(member)} title="Remove member" type="button">{removingId === member.profile_id ? <FiLoader className="animate-spin" /> : <FiUserMinus />}</button>}
          </div>)}
        </div>
        {error && <p className="px-5 py-3 text-xs text-danger">{error}</p>}
      </div>
    </div>}
    <ConfirmationModal confirmLabel="Remove" description="They will lose access to this group and its conversations. Messages they already viewed cannot be removed from their device." onCancel={() => setMemberToRemove(null)} onConfirm={() => { if (memberToRemove) void removeMember(memberToRemove); }} open={Boolean(memberToRemove)} pending={Boolean(removingId)} title={`Remove ${memberToRemove?.profile.full_name ?? "this member"} from the group?`} />
  </>;
}
