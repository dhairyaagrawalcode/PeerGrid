"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FiFlag, FiHeart, FiLoader, FiMessageCircle, FiSend } from "react-icons/fi";
import { addPostComment, getPostComments, reportPost, togglePostLike } from "@/app/actions/post-engagement";
import { initials, timeAgo } from "@/app/lib/format";
import type { PostComment } from "@/app/types";
import AvatarImage from "./avatar-image";
import PostBody from "./post-body";

export default function PostEngagement({ postId, authorId, initialLiked, initialLikeCount, initialCommentCount }: { postId: string; authorId: string; initialLiked: boolean; initialLikeCount: number; initialCommentCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [comment, setComment] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function like() {
    setError(null);
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(!previousLiked);
    setLikeCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));
    startTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.error) {
        setLiked(previousLiked);
        setLikeCount(previousCount);
        return setError(result.error);
      }
      setLiked(result.liked);
      if (result.count !== null) setLikeCount(result.count);
    });
  }

  function loadComments() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (!nextExpanded || comments) return;
    setError(null);
    startTransition(async () => {
      const result = await getPostComments(postId);
      if (result.error) return setError(result.error);
      setComments(result.comments);
      setHasMoreComments(result.hasMore);
    });
  }

  function loadOlderComments() {
    const oldest = comments?.[0];
    if (!oldest || isPending) return;
    startTransition(async () => {
      const result = await getPostComments(postId, oldest.created_at);
      if (result.error) return setError(result.error);
      setComments((current) => [...result.comments, ...(current ?? [])]);
      setHasMoreComments(result.hasMore);
    });
  }

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const result = await addPostComment(postId, body);
      if (result.error) return setError(result.error);
      if (result.comment) setComments((current) => [...(current ?? []), result.comment]);
      setCommentCount((current) => result.count ?? current + 1);
      setComment("");
      setExpanded(true);
    });
  }

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await reportPost(postId, reportReason, reportDetails);
      if (result.error) return setError(result.error);
      setReported(true);
      setReportOpen(false);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-1 px-3 py-2 sm:px-4">
        <button aria-pressed={liked} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-card ${liked ? "text-primary" : "text-muted hover:text-font"}`} disabled={isPending} onClick={like} type="button"><FiHeart className={liked ? "fill-current" : ""} /> {likeCount} {likeCount === 1 ? "Like" : "Likes"}</button>
        <button aria-expanded={expanded} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted hover:bg-card hover:text-font" onClick={loadComments} type="button"><FiMessageCircle /> {commentCount} {commentCount === 1 ? "Comment" : "Comments"}</button>
        {authorId && <button aria-expanded={reportOpen} className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-muted hover:bg-card hover:text-font" disabled={reported} onClick={() => setReportOpen((current) => !current)} type="button"><FiFlag /> {reported ? "Reported" : "Report"}</button>}
      </div>

      {reportOpen && (
        <form className="border-t border-line px-4 py-3 sm:px-5" onSubmit={submitReport}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select aria-label="Report reason" className="field sm:max-w-44" onChange={(event) => setReportReason(event.target.value)} value={reportReason}><option value="spam">Spam</option><option value="abuse">Abuse</option><option value="inappropriate">Inappropriate</option><option value="misleading">Misleading</option><option value="other">Other</option></select>
            <input aria-label="Report details" className="field flex-1" maxLength={500} onChange={(event) => setReportDetails(event.target.value)} placeholder="Optional details" value={reportDetails} />
            <button className="button button-secondary !min-h-10" disabled={isPending} type="submit">Submit report</button>
          </div>
        </form>
      )}

      {expanded && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <div className="space-y-4">
            {hasMoreComments && comments?.length ? (
              <button className="text-xs font-semibold text-muted hover:text-font" disabled={isPending} onClick={loadOlderComments} type="button">
                Load older comments
              </button>
            ) : null}
            {comments?.map((item) => (
              <div className="flex gap-2.5" key={item.id}>
                <Link className="avatar !h-8 !w-8" href={`/students/${item.author.username}`}>{item.author.avatar_url ? <AvatarImage alt={item.author.full_name} src={item.author.avatar_url} /> : initials(item.author.full_name)}</Link>
                <div className="min-w-0 flex-1 rounded-xl bg-panel px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3"><Link className="truncate text-xs font-bold hover:text-primary" href={`/students/${item.author.username}`}>{item.author.full_name}</Link><span className="shrink-0 text-[10px] text-muted">{timeAgo(item.created_at)}</span></div>
                  <PostBody className="mt-1 text-xs leading-5 text-subtle" text={item.body} />
                </div>
              </div>
            ))}
            {comments?.length === 0 && <p className="text-xs text-muted">No comments yet.</p>}
            {!comments && isPending && <p className="flex items-center gap-2 text-xs text-muted"><FiLoader className="animate-spin" /> Loading comments</p>}
          </div>

          <form className="mt-4 flex gap-2" onSubmit={submitComment}>
            <input aria-label="Add a comment" className="field !min-h-10 flex-1" maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment…" value={comment} />
            <button aria-label="Post comment" className="button button-primary !min-h-10 !px-3" disabled={isPending || !comment.trim()} type="submit">{isPending ? <FiLoader className="animate-spin" /> : <FiSend />}</button>
          </form>
        </div>
      )}
      {error && <p className="px-4 py-2 text-xs text-danger sm:px-5" role="alert">{error}</p>}
    </div>
  );
}
