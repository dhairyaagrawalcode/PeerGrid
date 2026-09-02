import { FiUserCheck, FiUsers } from "react-icons/fi";
import Link from "next/link";
import EmptyState from "@/app/components/empty-state";
import StudentResult from "@/app/components/student-result";
import { requireStudent } from "@/app/lib/auth";
import { getFollows, getStudentsByIds, NETWORK_PAGE_SIZE } from "@/app/lib/data";

function pageValue(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ view?: string; followersPage?: string; followingPage?: string }> }) {
  const params = await searchParams;
  const view = params.view === "following" ? "following" : "followers";
  const followersPage = pageValue(params.followersPage);
  const followingPage = pageValue(params.followingPage);
  const { supabase, user } = await requireStudent();
  const follows = await getFollows(supabase, user.id);
  const followingIds = follows.filter((item) => item.follower_id === user.id).map((item) => item.following_id);
  const followerIds = follows.filter((item) => item.following_id === user.id).map((item) => item.follower_id);
  const followingSet = new Set(followingIds);
  const sourceIds = view === "followers" ? followerIds : followingIds;
  const currentPage = view === "followers" ? followersPage : followingPage;
  const visibleIds = sourceIds.slice(currentPage * NETWORK_PAGE_SIZE, (currentPage + 1) * NETWORK_PAGE_SIZE);
  const students = await getStudentsByIds(supabase, visibleIds);
  const byId = new Map(students.map((student) => [student.id, student]));
  const visibleStudents = visibleIds.map((id) => byId.get(id)).filter(Boolean);

  return (
    <div className="app-page">
      <p className="eyebrow">Your network</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Followers &amp; following</h1><p className="mt-2 text-sm text-muted">Students who follow you and people you follow.</p>
      <nav aria-label="Connection lists" className="mt-7 flex gap-6 border-b border-line"><Link className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold ${view === "followers" ? "border-primary text-font" : "border-transparent text-muted hover:text-font"}`} href="/connections?view=followers#followers"><FiUsers /> Followers <span className="text-xs text-muted">{followerIds.length}</span></Link><Link className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold ${view === "following" ? "border-primary text-font" : "border-transparent text-muted hover:text-font"}`} href="/connections?view=following#following"><FiUserCheck /> Following <span className="text-xs text-muted">{followingIds.length}</span></Link></nav>
      <section className="scroll-mt-24 pt-4" id={view}>{visibleStudents.length ? <><div className="divide-y divide-line">{visibleStudents.map((student) => <StudentResult currentId={user.id} isFollowing={view === "following" || followingSet.has(student!.id)} key={student!.id} student={student!} />)}</div><div className="flex justify-between py-4">{currentPage > 0 ? <Link className="text-xs font-semibold text-muted hover:text-font" href={`/connections?view=${view}&${view}Page=${currentPage - 1}#${view}`}>Newer</Link> : <span />}{(currentPage + 1) * NETWORK_PAGE_SIZE < sourceIds.length ? <Link className="text-xs font-semibold text-muted hover:text-font" href={`/connections?view=${view}&${view}Page=${currentPage + 1}#${view}`}>More</Link> : <span />}</div></> : view === "followers" ? <p className="py-10 text-center text-sm text-muted">No followers yet.</p> : <EmptyState icon={<FiUsers size={21} />} title="Find people to follow" copy="Discover students with shared skills and interests." action={<Link className="button button-primary" href="/discover">Discover students</Link>} />}</section>
    </div>
  );
}
