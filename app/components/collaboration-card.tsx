import Link from "next/link";
import { FiMapPin, FiMoreHorizontal } from "react-icons/fi";
import { deleteCollaboration, setCollaborationStatus } from "@/app/actions/collaborations";
import { initials, timeAgo } from "@/app/lib/format";
import type { CollaborationPost } from "@/app/types";
import AvatarImage from "./avatar-image";
import FollowControls from "./follow-controls";

export default function CollaborationCard({ post, currentId, isFollowing }: { post: CollaborationPost; currentId: string; isFollowing: boolean }) {
  const own = post.author_id === currentId;
  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <Link className="flex min-w-0 items-center gap-3" href={own ? "/profile" : `/students/${post.author.username}`}>
          <span className="avatar">{post.author.avatar_url ? <AvatarImage alt={post.author.full_name} src={post.author.avatar_url} /> : initials(post.author.full_name)}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold">{post.author.full_name}</span><span className="block truncate text-xs text-muted">@{post.author.username} · {timeAgo(post.created_at)}</span></span>
        </Link>
        <span className={`chip ${post.status === "open" ? "!border-primary/20 !bg-primary/10 !text-primary" : "!text-muted"}`}>{post.status}</span>
      </div>
      <h2 className="mt-5 text-lg font-bold leading-snug sm:text-xl">{post.title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-subtle">{post.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">{post.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="flex items-center gap-1.5 text-xs text-muted"><FiMapPin className="text-secondary" />{post.campus?.name ?? "All NST campuses"}</p>
        {own ? <div className="flex gap-2"><form action={setCollaborationStatus}><input name="id" type="hidden" value={post.id} /><input name="status" type="hidden" value={post.status === "open" ? "closed" : "open"} /><button className="button button-secondary !min-h-9 !px-3 !text-xs" type="submit">Mark {post.status === "open" ? "closed" : "open"}</button></form><form action={deleteCollaboration}><input name="id" type="hidden" value={post.id} /><button aria-label="Delete collaboration post" className="button button-danger !min-h-9 !px-3" type="submit"><FiMoreHorizontal /></button></form></div> : <div className="flex items-center gap-2"><Link className="button button-secondary !min-h-9 !px-3 !text-xs" href={`/students/${post.author.username}`}>View student</Link><FollowControls compact currentId={currentId} isFollowing={isFollowing} targetId={post.author_id} /></div>}
      </div>
    </article>
  );
}
