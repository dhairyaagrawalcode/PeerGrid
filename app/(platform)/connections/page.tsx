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

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ followersPage?: string; followingPage?: string }> }) {
  const params = await searchParams;
  const followersPage = pageValue(params.followersPage);
  const followingPage = pageValue(params.followingPage);
  const { supabase, user } = await requireStudent();
  const follows = await getFollows(supabase, user.id);
  const followingIds = follows.filter((item) => item.follower_id === user.id).map((item) => item.following_id);
  const followerIds = follows.filter((item) => item.following_id === user.id).map((item) => item.follower_id);
  const followingSet = new Set(followingIds);
  const visibleFollowerIds = followerIds.slice(followersPage * NETWORK_PAGE_SIZE, (followersPage + 1) * NETWORK_PAGE_SIZE);
  const visibleFollowingIds = followingIds.slice(followingPage * NETWORK_PAGE_SIZE, (followingPage + 1) * NETWORK_PAGE_SIZE);
  const [followerStudents, followingStudents] = await Promise.all([
    getStudentsByIds(supabase, visibleFollowerIds),
    getStudentsByIds(supabase, visibleFollowingIds),
  ]);
  const followerById = new Map(followerStudents.map((student) => [student.id, student]));
  const followingById = new Map(followingStudents.map((student) => [student.id, student]));
  const followers = visibleFollowerIds.map((id) => followerById.get(id)).filter(Boolean);
  const following = visibleFollowingIds.map((id) => followingById.get(id)).filter(Boolean);

  return (
    <div className="app-page">
      <p className="eyebrow">Your network</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Followers &amp; following</h1><p className="mt-2 text-sm text-muted">Students who follow you and people you follow.</p>
      <section className="mt-8"><h2 className="flex items-center gap-2 font-bold"><FiUsers className="text-secondary" /> Followers <span className="text-xs font-semibold text-muted">{followerIds.length}</span></h2>{followers.length ? <><div className="mt-4 divide-y divide-line border-y border-line">{followers.map((student) => <StudentResult currentId={user.id} isFollowing={followingSet.has(student!.id)} key={student!.id} student={student!} />)}</div><div className="flex justify-between py-4">{followersPage > 0 ? <Link className="text-xs font-semibold text-muted hover:text-font" href={`/connections?followersPage=${followersPage - 1}&followingPage=${followingPage}`}>Newer followers</Link> : <span />}{(followersPage + 1) * NETWORK_PAGE_SIZE < followerIds.length ? <Link className="text-xs font-semibold text-muted hover:text-font" href={`/connections?followersPage=${followersPage + 1}&followingPage=${followingPage}`}>More followers</Link> : <span />}</div></> : <p className="mt-4 border-y border-line py-8 text-center text-sm text-muted">No followers yet.</p>}</section>
      <section className="mt-10"><h2 className="flex items-center gap-2 font-bold"><FiUserCheck className="text-primary" /> Following <span className="text-xs font-semibold text-muted">{followingIds.length}</span></h2>{following.length ? <><div className="mt-4 divide-y divide-line border-y border-line">{following.map((student) => <StudentResult currentId={user.id} isFollowing key={student!.id} student={student!} />)}</div><div className="flex justify-between py-4">{followingPage > 0 ? <Link className="text-xs font-semibold text-muted hover:text-font" href={`/connections?followersPage=${followersPage}&followingPage=${followingPage - 1}`}>Newer following</Link> : <span />}{(followingPage + 1) * NETWORK_PAGE_SIZE < followingIds.length ? <Link className="text-xs font-semibold text-muted hover:text-font" href={`/connections?followersPage=${followersPage}&followingPage=${followingPage + 1}`}>More following</Link> : <span />}</div></> : <div className="mt-4"><EmptyState icon={<FiUsers size={21} />} title="Find people to follow" copy="Discover students with shared skills and interests." action={<Link className="button button-primary" href="/discover">Discover students</Link>} /></div>}</section>
    </div>
  );
}
