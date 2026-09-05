import Link from "next/link";
import { FiClock, FiMapPin, FiUsers } from "react-icons/fi";
import { initials, timeAgo } from "@/app/lib/format";
import type { Campus, CollaborationPost } from "@/app/types";
import AvatarImage from "./avatar-image";
import CollaborationManager from "./collaboration-manager";
import ConnectForCollaborationButton from "./connect-for-collaboration-button";

export default function CollaborationCard({ post, currentId, campuses }: { post: CollaborationPost; currentId: string; campuses: Campus[] }) {
  const own = post.author_id === currentId;
  const available = post.status === "open";
  const typeLabel = post.collaboration_type === "study" ? "study group" : post.collaboration_type.replace("_", " ");
  const openings = post.team_capacity === null ? null : Math.max(post.team_capacity - post.team_current, 0);
  return (
    <article className="surface scroll-mt-24 p-4 sm:p-6" id={`collaboration-${post.id}`}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <Link className="flex min-w-0 items-center gap-3" href={own ? "/profile" : `/students/${post.author.username}`}>
          <span className="avatar">{post.author.avatar_url ? <AvatarImage alt={post.author.full_name} src={post.author.avatar_url} /> : initials(post.author.full_name)}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold">{post.author.full_name}</span><span className="block truncate text-xs text-muted">@{post.author.username} · {timeAgo(post.created_at)}</span></span>
        </Link>
        <span className={`chip shrink-0 capitalize ${post.status === "open" ? "!border-primary/20 !bg-primary/10 !text-primary" : "!text-muted"}`}>{post.status}</span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{typeLabel}</p>
      <h2 className="mt-1.5 text-lg font-bold leading-snug sm:text-xl">{post.title}</h2>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-subtle">{post.description}</p>
      {post.recommendation_reason && !own && <p className="mt-3 text-xs text-muted">{post.recommendation_reason}</p>}
      {!!post.required_skills.length && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Skills needed</p><div className="mt-2 flex flex-wrap gap-2">{post.required_skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div></div>}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-1.5"><FiMapPin />{post.campus?.name ?? "All NST campuses"}</span>
        <span className="flex items-center gap-1.5"><FiUsers />{post.team_current}{post.team_capacity ? ` / ${post.team_capacity}` : ""} members{openings !== null ? ` · ${openings} opening${openings === 1 ? "" : "s"}` : ""}</span>
        {post.commitment && <span className="flex items-center gap-1.5"><FiClock />{post.commitment}</span>}
      </div>
      {(own || available) && <div className="mt-5 flex items-center justify-end border-t border-line pt-4">
        {own ? <CollaborationManager campuses={campuses} post={post} /> : available ? <ConnectForCollaborationButton collaborationId={post.id} creatorId={post.author_id} title={post.title} /> : null}
      </div>}
    </article>
  );
}
