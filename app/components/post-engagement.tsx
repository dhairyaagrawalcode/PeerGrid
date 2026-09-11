"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FiBookmark, FiHeart, FiLoader, FiMessageCircle, FiSend } from "react-icons/fi";
import { addPostComment, getPostComments, togglePostLike, toggleSavedPost } from "@/app/actions/post-engagement";
import { initials, timeAgo } from "@/app/lib/format";
import type { PostComment } from "@/app/types";
import AvatarImage from "./avatar-image";
import PostBody from "./post-body";

function AnimatedCount({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="post-engagement-count">
      <span className="post-engagement-count-value" key={value}>{value}</span>
    </span>
  );
}

export default function PostEngagement({ postId, initialLiked, initialSaved, initialLikeCount, initialCommentCount }: { postId: string; initialLiked: boolean; initialSaved: boolean; initialLikeCount: number; initialCommentCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();

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

  function save() {
    setError(null);
    const previousSaved = saved;
    setSaved(!previousSaved);
    startSaveTransition(async () => {
      const result = await toggleSavedPost(postId);
      if (result.error) {
        setSaved(previousSaved);
        return setError(result.error);
      }
      setSaved(result.saved);
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

  return (
    <div className="post-engagement">
      <div className="post-engagement-actions flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1">
          <button aria-label={`${liked ? "Unlike" : "Like"} post, ${likeCount} ${likeCount === 1 ? "like" : "likes"}`} aria-pressed={liked} className="post-engagement-button flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-font hover:bg-card" disabled={isPending} onClick={like} type="button"><FiHeart className={liked ? "fill-current" : ""} /><AnimatedCount value={likeCount} /></button>
          <button aria-label={`Show comments, ${commentCount} ${commentCount === 1 ? "comment" : "comments"}`} aria-expanded={expanded} className="post-engagement-button flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-font hover:bg-card" onClick={loadComments} type="button"><FiMessageCircle className={expanded ? "fill-current" : ""} /><AnimatedCount value={commentCount} /></button>
        </div>
        <button aria-label={saved ? "Remove post from saved" : "Save post"} aria-pressed={saved} className="post-engagement-button flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-font hover:bg-card" disabled={isSavePending} onClick={save} type="button"><FiBookmark className={saved ? "fill-current" : ""} /><span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span></button>
      </div>

      {expanded && (
        <div className="post-comments border-t border-line px-4 py-4 sm:px-5">
          <div className="post-comments-list space-y-4">
            {hasMoreComments && comments?.length ? (
              <button className="text-xs font-semibold text-muted hover:text-font" disabled={isPending} onClick={loadOlderComments} type="button">
                Load older comments
              </button>
            ) : null}
            {comments?.map((item) => (
              <div className="post-comment flex gap-2.5" key={item.id}>
                <Link className="avatar !h-8 !w-8" href={`/students/${item.author.username}`}>{item.author.avatar_url ? <AvatarImage alt={item.author.full_name} src={item.author.avatar_url} /> : initials(item.author.full_name)}</Link>
                <div className="post-comment-bubble min-w-0 flex-1 rounded-xl bg-panel px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3"><Link className="truncate text-xs font-bold hover:text-primary" href={`/students/${item.author.username}`}>{item.author.full_name}</Link><span className="shrink-0 text-[10px] text-muted">{timeAgo(item.created_at)}</span></div>
                  <PostBody className="mt-1 text-xs leading-5 text-subtle" text={item.body} />
                </div>
              </div>
            ))}
            {comments?.length === 0 && <p className="text-xs text-muted">No comments yet.</p>}
            {!comments && isPending && <p className="flex items-center gap-2 text-xs text-muted"><FiLoader className="animate-spin" /> Loading comments</p>}
          </div>

          <form className="post-comment-form mt-4 flex gap-2" onSubmit={submitComment}>
            <input aria-label="Add a comment" className="field !min-h-10 flex-1" maxLength={1000} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment…" value={comment} />
            <button aria-label="Post comment" className="button button-primary !min-h-10 !px-3" disabled={isPending || !comment.trim()} type="submit">{isPending ? <FiLoader className="animate-spin" /> : <FiSend />}</button>
          </form>
        </div>
      )}
      {error && <p className="px-4 py-2 text-xs text-danger sm:px-5" role="alert">{error}</p>}
    </div>
  );
}
