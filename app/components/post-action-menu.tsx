"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiEdit3,
  FiEyeOff,
  FiFlag,
  FiLoader,
  FiMoreHorizontal,
  FiStar,
  FiTrash2,
  FiUserMinus,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { followUser, unfollowUser } from "@/app/actions/follows";
import { reportPost } from "@/app/actions/post-engagement";
import { deleteSocialPost, updateSocialPost } from "@/app/actions/posts";
import { recordPostPreference } from "@/app/actions/recommendations";
import ConfirmationModal from "./confirmation-modal";

type DialogKind = "edit" | "report" | null;

export default function PostActionMenu({
  authorId,
  body,
  hasAttachment,
  initialFollowing,
  own,
  postId,
}: {
  authorId: string;
  body: string;
  hasAttachment: boolean;
  initialFollowing: boolean;
  own: boolean;
  postId: string;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
  const [editBody, setEditBody] = useState(body);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open && !dialog) return;
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setOpen(false);
        setDialog(null);
      }
    }
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [dialog, open, pending]);

  function closeMenu() {
    if (!pending) setOpen(false);
  }

  function toggleFollow() {
    const previous = following;
    setFollowing(!previous);
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = previous ? await unfollowUser(authorId) : await followUser(authorId);
      if (result.error) {
        setFollowing(previous);
        setError(result.error);
        return;
      }
      setNotice(previous ? "Unfollowed" : "Following");
      router.refresh();
    });
  }

  function choosePreference(preference: "interested" | "not_interested") {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await recordPostPreference(postId, preference);
      if (result.error) return setError(result.error);
      setNotice(preference === "interested" ? "We’ll show you more posts like this." : "We’ll show you fewer posts like this.");
      if (preference === "not_interested") {
        menuRef.current?.closest("article")?.setAttribute("hidden", "");
      }
      window.setTimeout(() => setOpen(false), 650);
      router.refresh();
    });
  }

  function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await updateSocialPost(postId, editBody);
      if (result.error) return setError(result.error);
      setDialog(null);
      setOpen(false);
      router.refresh();
    });
  }

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await reportPost(postId, reportReason, reportDetails);
      if (result.error) return setError(result.error);
      setDialog(null);
      setOpen(false);
      setNotice("Report submitted");
    });
  }

  function removePost() {
    setError("");
    startTransition(async () => {
      const result = await deleteSocialPost(postId);
      if (result.error) return setError(result.error);
      setDeleteOpen(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="post-action-root relative shrink-0" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Post actions"
        className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-card hover:text-font"
        onClick={() => { setError(""); setNotice(""); setOpen((current) => !current); }}
        type="button"
      >
        <FiMoreHorizontal aria-hidden="true" />
      </button>

      {open && (
        <>
          <button aria-label="Close post actions" className="post-action-menu-backdrop" onClick={closeMenu} type="button" />
          <div aria-label="Post actions" className="post-action-menu-panel" role="menu">
            <div className="post-action-menu-heading">
              <strong>Post actions</strong>
              <button aria-label="Close post actions" className="mobile-icon-button" onClick={closeMenu} type="button"><FiX /></button>
            </div>
            {own ? (
              <>
                <button onClick={() => { setEditBody(body); setError(""); setDialog("edit"); setOpen(false); }} role="menuitem" type="button"><FiEdit3 /> Edit post</button>
                <button className="text-danger" onClick={() => { setDeleteOpen(true); setOpen(false); }} role="menuitem" type="button"><FiTrash2 /> Delete post</button>
              </>
            ) : (
              <>
                <button disabled={pending} onClick={toggleFollow} role="menuitem" type="button">{following ? <FiUserMinus /> : <FiUserPlus />} {following ? "Unfollow user" : "Follow user"}</button>
                <button disabled={pending} onClick={() => choosePreference("interested")} role="menuitem" type="button"><FiStar /> Interested</button>
                <button disabled={pending} onClick={() => choosePreference("not_interested")} role="menuitem" type="button"><FiEyeOff /> Not interested</button>
                <button onClick={() => { setError(""); setDialog("report"); setOpen(false); }} role="menuitem" type="button"><FiFlag /> Report</button>
              </>
            )}
            {pending && <p className="post-action-status"><FiLoader className="animate-spin" /> Updating…</p>}
            {notice && <p className="post-action-status text-subtle">{notice}</p>}
            {error && <p className="post-action-status text-danger" role="alert">{error}</p>}
          </div>
        </>
      )}

      {dialog === "edit" && (
        <div aria-modal="true" className="responsive-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setDialog(null); }} role="dialog">
          <form className="responsive-modal-panel p-5" onSubmit={saveEdit}>
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Edit post</h2><p className="mt-1 text-xs text-muted">Your existing attachment will stay unchanged.</p></div><button aria-label="Close editor" className="mobile-icon-button" disabled={pending} onClick={() => setDialog(null)} type="button"><FiX /></button></div>
            <textarea aria-label="Post text" autoFocus className="field mt-4 min-h-40" maxLength={5000} onChange={(event) => setEditBody(event.target.value)} value={editBody} />
            {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
            <div className="mt-4 flex justify-end gap-2"><button className="button button-secondary" disabled={pending} onClick={() => setDialog(null)} type="button">Cancel</button><button className="button button-primary" disabled={pending || (!editBody.trim() && !hasAttachment)} type="submit">{pending && <FiLoader className="animate-spin" />}Save</button></div>
          </form>
        </div>
      )}

      {dialog === "report" && (
        <div aria-modal="true" className="responsive-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setDialog(null); }} role="dialog">
          <form className="responsive-modal-panel p-5" onSubmit={submitReport}>
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Report post</h2><p className="mt-1 text-xs text-muted">Reports are reviewed by PeerGrid moderators.</p></div><button aria-label="Close report" className="mobile-icon-button" disabled={pending} onClick={() => setDialog(null)} type="button"><FiX /></button></div>
            <label className="label mt-4" htmlFor={`report-reason-${postId}`}>Reason</label>
            <select className="field" id={`report-reason-${postId}`} onChange={(event) => setReportReason(event.target.value)} value={reportReason}><option value="spam">Spam</option><option value="abuse">Abuse</option><option value="inappropriate">Inappropriate</option><option value="misleading">Misleading</option><option value="other">Other</option></select>
            <label className="label mt-4" htmlFor={`report-details-${postId}`}>Details (optional)</label>
            <textarea className="field min-h-28" id={`report-details-${postId}`} maxLength={500} onChange={(event) => setReportDetails(event.target.value)} value={reportDetails} />
            {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
            <button className="button button-primary mt-4 w-full" disabled={pending} type="submit">{pending && <FiLoader className="animate-spin" />}Submit report</button>
          </form>
        </div>
      )}

      <ConfirmationModal
        confirmLabel="Delete"
        description={error || (hasAttachment ? "This permanently removes your post and its attached media or file. This cannot be undone." : "This permanently removes your post. This cannot be undone.")}
        onCancel={() => { if (!pending) setDeleteOpen(false); }}
        onConfirm={removePost}
        open={deleteOpen}
        pending={pending}
        title="Delete this post?"
      />
    </div>
  );
}
