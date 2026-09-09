import Link from "next/link";
import { FiDownload, FiFileText } from "react-icons/fi";
import { initials, timeAgo } from "@/app/lib/format";
import type { SocialPost } from "@/app/types";
import AvatarImage from "./avatar-image";
import PostBody from "./post-body";
import PostEngagement from "./post-engagement";
import PostImage from "./post-image";
import PostActionMenu from "./post-action-menu";

function readableSize(bytes: number | null) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function documentType(mime: string | null) {
  if (mime === "application/pdf") return "PDF";
  if (mime?.includes("word")) return "Word document";
  if (mime?.includes("powerpoint") || mime?.includes("presentation")) return "Presentation";
  if (mime?.includes("excel") || mime?.includes("spreadsheet")) return "Spreadsheet";
  return "Document";
}

export default function SocialPostCard({ post, flat = false, own = false }: { post: SocialPost; flat?: boolean; own?: boolean }) {
  const profileHref = `/students/${post.author.username}`;
  return (
    <article className={`social-post ${flat ? "scroll-mt-24 py-2" : "surface scroll-mt-24"}`} id={`post-${post.id}`}>
      <div className="post-copy p-4 sm:p-5">
        <div className="post-author flex min-w-0 items-center gap-2">
        <Link className="flex min-w-0 flex-1 items-center gap-3" href={profileHref}>
          <span className="post-avatar avatar !rounded-full">{post.author.avatar_url ? <AvatarImage alt={post.author.full_name} src={post.author.avatar_url} /> : initials(post.author.full_name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold hover:text-primary">{post.author.full_name}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">
              {post.author.campus?.name || post.author.program || `@${post.author.username}`} · {timeAgo(post.created_at)}
            </span>
          </span>
        </Link>
        <PostActionMenu authorId={post.author_id} body={post.body} hasAttachment={Boolean(post.attachment_path)} initialFollowing={post.viewer_follows_author} own={own} postId={post.id} />
        </div>
        {post.recommendation_reason && <p className="mt-3 text-[11px] text-muted">{post.recommendation_reason}</p>}
        {post.body && <PostBody className="mt-4 text-sm leading-6 text-subtle" text={post.body} />}
      </div>

      {post.attachment_kind === "image" && post.attachment_url && (
        <div className="post-media mx-4 mb-4 block w-auto overflow-hidden rounded-xl border border-line bg-black/20 sm:mx-5">
          <PostImage alt={post.attachment_name || "Post attachment"} mime={post.attachment_mime} original={post.attachment_url} postId={post.id} />
        </div>
      )}
      {post.attachment_kind === "video" && post.attachment_url && (
        <div className="post-media mx-4 mb-4 flex items-center justify-center overflow-hidden rounded-xl border border-line bg-black sm:mx-5">
          <video className="mx-auto h-auto max-h-[min(68vh,640px)] w-auto max-w-full object-contain" controls playsInline preload="metadata" src={post.attachment_url} />
        </div>
      )}
      {post.attachment_kind === "document" && post.attachment_url && (
        <a aria-label={`Open ${post.attachment_name || "document"}`} className="post-document mx-4 mb-4 flex min-w-0 items-center gap-3 rounded-xl border border-line bg-panel p-4 hover:border-muted sm:mx-5" href={post.attachment_url} rel="noreferrer" target="_blank">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-subtle"><FiFileText size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{post.attachment_name || "Document"}</span><span className="mt-0.5 block truncate text-xs text-muted">{[documentType(post.attachment_mime), readableSize(post.attachment_size), "Open document"].filter(Boolean).join(" · ")}</span></span>
          <FiDownload className="shrink-0 text-muted" />
        </a>
      )}
      {post.attachment_kind === "document" && !post.attachment_url && (
        <div aria-label={`${post.attachment_name || "Document"} is unavailable`} className="post-document mx-4 mb-4 flex min-w-0 items-center gap-3 rounded-xl border border-line bg-panel p-4 opacity-70 sm:mx-5" role="status">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-subtle"><FiFileText size={20} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{post.attachment_name || "Document"}</span><span className="mt-0.5 block truncate text-xs text-muted">{[documentType(post.attachment_mime), readableSize(post.attachment_size), "Temporarily unavailable"].filter(Boolean).join(" · ")}</span></span>
        </div>
      )}

      <PostEngagement initialCommentCount={post.comment_count} initialLikeCount={post.like_count} initialLiked={post.viewer_liked} initialSaved={post.viewer_saved} postId={post.id} />
    </article>
  );
}
