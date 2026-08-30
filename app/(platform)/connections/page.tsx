import { FiUserCheck, FiUsers } from "react-icons/fi";
import EmptyState from "@/app/components/empty-state";
import StudentCard from "@/app/components/student-card";
import { requireStudent } from "@/app/lib/auth";
import { getFollows, getStudents } from "@/app/lib/data";

export default async function ConnectionsPage() {
  const { supabase, user } = await requireStudent();
  const [follows, students] = await Promise.all([
    getFollows(supabase, user.id),
    getStudents(supabase, user.id),
  ]);
  const byId = new Map(students.map((student) => [student.id, student]));
  const followingIds = follows.filter((item) => item.follower_id === user.id).map((item) => item.following_id);
  const followerIds = follows.filter((item) => item.following_id === user.id).map((item) => item.follower_id);
  const followingSet = new Set(followingIds);
  const following = followingIds.map((id) => byId.get(id)).filter(Boolean);
  const followers = followerIds.map((id) => byId.get(id)).filter(Boolean);

  return (
    <div>
      <p className="eyebrow">Your network</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Followers &amp; following</h1><p className="mt-2 text-sm text-muted">Students who follow you and people you follow.</p>
      <section className="mt-8"><h2 className="flex items-center gap-2 font-bold"><FiUsers className="text-secondary" /> Followers <span className="chip">{followers.length}</span></h2>{followers.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{followers.map((student) => <StudentCard currentId={user.id} isFollowing={followingSet.has(student!.id)} key={student!.id} student={student!} />)}</div> : <p className="mt-3 text-sm text-muted">No followers yet.</p>}</section>
      <section className="mt-10"><h2 className="flex items-center gap-2 font-bold"><FiUserCheck className="text-primary" /> Following <span className="chip">{following.length}</span></h2>{following.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{following.map((student) => <StudentCard currentId={user.id} isFollowing key={student!.id} student={student!} />)}</div> : <div className="mt-4"><EmptyState icon={<FiUsers size={21} />} title="Find people to follow" copy="Discover students with shared skills and interests." action={<a className="button button-primary" href="/discover">Discover students</a>} /></div>}</section>
    </div>
  );
}
