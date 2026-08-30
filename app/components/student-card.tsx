import Link from "next/link";
import { FiArrowUpRight, FiMapPin } from "react-icons/fi";
import { initials } from "@/app/lib/format";
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import FollowControls from "./follow-controls";

export default function StudentCard({ student, currentId, isFollowing }: { student: StudentProfile; currentId: string; isFollowing: boolean }) {
  return (
    <article className="surface flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <Link className="avatar !h-12 !w-12" href={`/students/${student.username}`}>{student.avatar_url ? <AvatarImage alt={student.full_name} src={student.avatar_url} /> : initials(student.full_name)}</Link>
        <div className="min-w-0 flex-1"><Link className="font-bold hover:text-primary" href={`/students/${student.username}`}>{student.full_name}</Link><p className="mt-0.5 text-xs text-muted">@{student.username}</p><p className="mt-2 flex items-center gap-1 text-[11px] text-muted"><FiMapPin className="text-secondary" />{student.campus?.name}</p></div>
      </div>
      <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-subtle">{student.bio || student.goals || "Open to meeting other student builders."}</p>
      {(student.skills?.length || student.interests?.length) ? <div className="mt-4 flex flex-wrap gap-1.5">{student.skills?.slice(0, 3).map((item) => <span className="tag text-secondary" key={`skill-${item.id}`}>{item.name}</span>)}{student.interests?.slice(0, 2).map((item) => <span className="tag" key={`interest-${item.id}`}>{item.name}</span>)}</div> : null}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5"><FollowControls compact currentId={currentId} isFollowing={isFollowing} targetId={student.id} /><Link className="flex items-center gap-1 text-xs font-bold text-muted hover:text-font" href={`/students/${student.username}`}>Profile <FiArrowUpRight /></Link></div>
    </article>
  );
}
