import Link from "next/link";
import { FiDownload, FiFileText } from "react-icons/fi";
import { initials, timeAgo } from "@/app/lib/format";
import type { SocialPost } from "@/app/types";
import AvatarImage from "./avatar-image";
import PostBody from "./post-body";
import PostEngagement from "./post-engagement";

export default function SocialPostCard({ post }: { post: SocialPost }) {
  const profileHref = `/students/${post.author.username}`;
  return (
    <article className="surface overflow-hidden">
      <div className="p-4 sm:p-5">
        <Link className="flex min-w-0 items-center gap-3" href={profileHref}>
          <span className="avatar !rounded-full">{post.author.avatar_url ? <AvatarImage alt={post.author.full_name} src={post.author.avatar_url} /> : initials(post.author.full_name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold hover:text-primary">{post.author.full_name}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">
              {post.author.campus?.name || post.author.program || `@${post.author.username}`} · {timeAgo(post.created_at)}
            </span>
          </span>
        </Link>
        {post.body && <PostBody className="mt-4 text-sm leading-6 text-[#d3d7df]" text={post.body} />}
      </div>

      {post.attachment_kind === "image" && post.attachment_url && (
        <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-white/8 bg-black/20 sm:mx-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- Post media is served from short-lived Supabase signed URLs. */}
          <img alt={post.attachment_name || "Post attachment"} className="max-h-[640px] w-full object-contain" loading="lazy" src={post.attachment_url} />
        </div>
      )}
      {post.attachment_kind === "video" && post.attachment_url && (
        <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-white/8 bg-black sm:mx-5">
          <video className="max-h-[640px] w-full" controls playsInline preload="metadata" src={post.attachment_url} />
        </div>
      )}
      {post.attachment_kind === "document" && post.attachment_url && (
        <a className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 hover:border-white/15 sm:mx-5" href={post.attachment_url} rel="noreferrer" target="_blank">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><FiFileText size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{post.attachment_name}</span><span className="mt-0.5 block text-xs text-muted">Open document</span></span>
          <FiDownload className="text-muted" />
        </a>
      )}

      <PostEngagement initialCommentCount={post.comment_count} initialLikeCount={post.like_count} initialLiked={post.viewer_liked} postId={post.id} />
    </article>
  );
}
