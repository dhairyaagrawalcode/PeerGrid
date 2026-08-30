"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FiHeart, FiLoader, FiMessageCircle, FiSend } from "react-icons/fi";
import { addPostComment, getPostComments, togglePostLike } from "@/app/actions/post-engagement";
import { initials, timeAgo } from "@/app/lib/format";
import type { PostComment } from "@/app/types";
import AvatarImage from "./avatar-image";
import PostBody from "./post-body";

export default function PostEngagement({ postId, initialLiked, initialLikeCount, initialCommentCount }: { postId: string; initialLiked: boolean; initialLikeCount: number; initialCommentCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function like() {
    setError(null);
    startTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.error) return setError(result.error);
      setLiked(result.liked);
      setLikeCount(result.count);
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
      const refreshed = await getPostComments(postId);
      if (refreshed.error) return setError(refreshed.error);
      setComments(refreshed.comments);
      setCommentCount(result.count);
      setComment("");
      setExpanded(true);
    });
  }

  return (
    <div className="border-t border-white/7">
      <div className="grid grid-cols-2 px-2 py-1.5 sm:px-3">
        <button aria-pressed={liked} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold hover:bg-white/5 ${liked ? "text-rose-300" : "text-muted hover:text-font"}`} disabled={isPending} onClick={like} type="button"><FiHeart className={liked ? "fill-current" : ""} /> {likeCount} {likeCount === 1 ? "Like" : "Likes"}</button>
        <button aria-expanded={expanded} className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-muted hover:bg-white/5 hover:text-font" onClick={loadComments} type="button"><FiMessageCircle /> {commentCount} {commentCount === 1 ? "Comment" : "Comments"}</button>
      </div>

      {expanded && (
        <div className="border-t border-white/7 px-4 py-4 sm:px-5">
          <div className="space-y-4">
            {comments?.map((item) => (
              <div className="flex gap-2.5" key={item.id}>
                <Link className="avatar !h-8 !w-8" href={`/students/${item.author.username}`}>{item.author.avatar_url ? <AvatarImage alt={item.author.full_name} src={item.author.avatar_url} /> : initials(item.author.full_name)}</Link>
                <div className="min-w-0 flex-1 rounded-xl bg-white/[0.035] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3"><Link className="truncate text-xs font-bold hover:text-primary" href={`/students/${item.author.username}`}>{item.author.full_name}</Link><span className="shrink-0 text-[10px] text-muted">{timeAgo(item.created_at)}</span></div>
                  <PostBody className="mt-1 text-xs leading-5 text-[#d3d7df]" text={item.body} />
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
      {error && <p className="border-t border-rose-400/10 px-4 py-2 text-xs text-rose-300 sm:px-5" role="alert">{error}</p>}
    </div>
  );
}
