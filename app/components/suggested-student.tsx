import Link from "next/link";
import { initials } from "@/app/lib/format";
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import FollowControls from "./follow-controls";

export default function SuggestedStudent({ student, currentId, isFollowing }: { student: StudentProfile; currentId: string; isFollowing: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Link className="avatar !h-10 !w-10" href={`/students/${student.username}`}>{student.avatar_url ? <AvatarImage alt={student.full_name} src={student.avatar_url} /> : initials(student.full_name)}</Link>
      <div className="min-w-0 flex-1">
        <Link className="block truncate text-xs font-bold hover:text-primary" href={`/students/${student.username}`}>{student.full_name}</Link>
        <p className="mt-0.5 truncate text-[11px] text-muted">{student.program || student.campus?.name}</p>
        <div className="mt-2"><FollowControls compact currentId={currentId} isFollowing={isFollowing} targetId={student.id} /></div>
      </div>
    </div>
  );
}
