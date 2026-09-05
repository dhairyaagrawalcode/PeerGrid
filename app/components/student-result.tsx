import Link from "next/link";
import { FiMapPin } from "react-icons/fi";
import { initials } from "@/app/lib/format";
import type { MutualFollowContext, StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import FollowControls from "./follow-controls";
import MutualConnections from "./mutual-connections";

export default function StudentResult({
  student,
  currentId,
  isFollowing,
  mutualContext,
}: {
  student: StudentProfile;
  currentId: string;
  isFollowing: boolean;
  mutualContext?: MutualFollowContext | null;
}) {
  const secondary = [student.program, student.graduation_year ? `Class of ${student.graduation_year}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-4 sm:flex sm:items-center sm:gap-4">
      <Link
        aria-label={`View ${student.full_name}'s profile`}
        className="avatar !h-12 !w-12 !rounded-full transition group-hover:ring-2 group-hover:ring-primary/25 sm:!h-13 sm:!w-13"
        href={`/students/${student.username}`}
      >
        {student.avatar_url ? (
          <AvatarImage alt={student.full_name} src={student.avatar_url} />
        ) : (
          initials(student.full_name)
        )}
      </Link>
      <Link className="min-w-0 flex-1" href={`/students/${student.username}`}>
        <span className="block truncate text-sm font-bold text-font transition group-hover:text-primary">
          {student.full_name}
        </span>
        <span className="mt-0.5 flex min-w-0 flex-col items-start gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-1.5">
          <span className="max-w-full truncate">@{student.username}</span>
          {student.campus?.name && (
            <>
              <span aria-hidden="true" className="hidden text-muted sm:inline">·</span>
              <span className="flex min-w-0 max-w-full items-center gap-1 truncate">
                <FiMapPin className="shrink-0 text-secondary" size={11} />
                <span className="truncate">{student.campus.name}</span>
              </span>
            </>
          )}
        </span>
        {(secondary || student.skills?.length) ? (
          <span className="mt-1 block text-[11px] text-muted/80 sm:truncate">
            {secondary || student.skills?.slice(0, 3).map((item) => item.name).join(" · ")}
          </span>
        ) : null}
        <MutualConnections className="mt-1" context={mutualContext} />
      </Link>
      <div className="col-start-2 justify-self-start sm:shrink-0"><FollowControls compact currentId={currentId} isFollowing={isFollowing} targetId={student.id} /></div>
    </article>
  );
}
