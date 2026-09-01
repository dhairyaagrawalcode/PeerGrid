"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCamera, FiChevronDown, FiLoader, FiUserMinus, FiUsers, FiX } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";
import { groupAvatarUrl, uploadGroupAvatar, validateGroupAvatar } from "@/app/lib/group-avatar";
import { initials } from "@/app/lib/format";
import type { ConversationMember } from "@/app/types";
import AvatarImage from "./avatar-image";

export default function GroupDetailsButton({ avatarPath: initialAvatarPath, conversationId, currentId, members: initialMembers, title }: {
  avatarPath: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const owner = members.find((member) => member.role === "owner");
  const canManage = owner?.profile_id === currentId;
  const avatarUrl = groupAvatarUrl(avatarPath);

  function closeModal() {
    if (uploading || removingId) return;
    setOpen(false);
    setError(null);
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
    if (!window.confirm(`Remove ${member.profile.full_name} from this group?`)) return;
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
  }

  return <>
    <button className="flex min-w-0 items-center gap-3 rounded-lg text-left" onClick={() => { setError(null); setOpen(true); }} type="button">
      <span className="avatar !h-10 !w-10 !rounded-full">{avatarUrl ? <AvatarImage alt={title} src={avatarUrl} /> : <FiUsers />}</span>
      <span className="min-w-0"><strong className="block truncate text-sm">{title}</strong><small className="block text-[10px] text-muted">{members.length} members · encrypted</small></span>
      <FiChevronDown className="shrink-0 text-muted" size={14} />
    </button>

    {open && <div aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} role="dialog">
      <div className="flex max-h-[min(680px,90dvh)] w-full max-w-md flex-col rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between px-5 py-4">
          <div><h2 className="text-base font-bold">Group details</h2><p className="mt-1 text-xs text-muted">{members.length} members</p></div>
          <button aria-label="Close group details" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={uploading || Boolean(removingId)} onClick={closeModal} type="button"><FiX /></button>
        </div>

        <div className="flex items-center gap-4 px-5 pb-5">
          <span className="avatar relative !h-16 !w-16 !rounded-full">{avatarUrl ? <AvatarImage alt={title} src={avatarUrl} /> : <FiUsers size={23} />}</span>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{title}</p><p className="mt-1 text-xs text-muted">End-to-end encrypted group</p></div>
          {canManage && <label className="button button-ghost cursor-pointer !min-h-9 !px-3 !text-xs">
            {uploading ? <FiLoader className="animate-spin" /> : <FiCamera />} {uploading ? "Uploading" : "Change photo"}
            <input accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(event) => { void changeAvatar(event.target.files?.[0]); event.target.value = ""; }} type="file" />
          </label>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-3 py-2">
          {members.map((member) => <div className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-card" key={member.profile_id}>
            <Link className="flex min-w-0 flex-1 items-center gap-3" href={`/students/${member.profile.username}`}>
              <span className="avatar !h-10 !w-10 !rounded-full">{member.profile.avatar_url ? <AvatarImage alt={member.profile.full_name} src={member.profile.avatar_url} /> : initials(member.profile.full_name)}</span>
              <span className="min-w-0"><strong className="block truncate text-sm">{member.profile.full_name}</strong><small className="block truncate text-[10px] text-muted">@{member.profile.username}{member.role === "owner" ? " · Admin" : ""}</small></span>
            </Link>
            {canManage && member.role !== "owner" && <button aria-label={`Remove ${member.profile.full_name}`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" disabled={Boolean(removingId)} onClick={() => void removeMember(member)} title="Remove member" type="button">{removingId === member.profile_id ? <FiLoader className="animate-spin" /> : <FiUserMinus />}</button>}
          </div>)}
        </div>
        {error && <p className="px-5 py-3 text-xs text-danger">{error}</p>}
      </div>
    </div>}
  </>;
}
