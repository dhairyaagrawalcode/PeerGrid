import Link from "next/link";
import { FiFileText, FiImage, FiPlus, FiUsers, FiVideo } from "react-icons/fi";
import EmptyState from "@/app/components/empty-state";
import SocialPostCard from "@/app/components/social-post-card";
import SuggestedStudent from "@/app/components/suggested-student";
import { initials } from "@/app/lib/format";
import { requireStudent } from "@/app/lib/auth";
import { getFollows, getSocialPosts, getStudent, getStudents } from "@/app/lib/data";
import AvatarImage from "@/app/components/avatar-image";

export default async function FeedPage() {
  const { supabase, user, profile } = await requireStudent();
  const [posts, follows, students, completeProfile] = await Promise.all([
    getSocialPosts(supabase, { limit: 30 }),
    getFollows(supabase, user.id),
    getStudents(supabase, user.id),
    getStudent(supabase, { id: user.id }),
  ]);

  const following = new Set(follows.filter((item) => item.follower_id === user.id).map((item) => item.following_id));
  const ownSkills = new Set(completeProfile?.skills?.map((item) => item.id) ?? []);
  const ownInterests = new Set(completeProfile?.interests?.map((item) => item.id) ?? []);
  const suggestions = students
    .filter((student) => !following.has(student.id))
    .map((student) => ({
      student,
      score:
        (student.campus_id === profile.campus_id ? 5 : 0)
        + (student.skills?.filter((item) => ownSkills.has(item.id)).length ?? 0)
        + (student.interests?.filter((item) => ownInterests.has(item.id)).length ?? 0) * 2,
    }))
    .sort((a, b) => b.score - a.score || a.student.full_name.localeCompare(b.student.full_name))
    .slice(0, 4)
    .map((item) => item.student);

  return (
    <div className="mx-auto grid max-w-[980px] gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <div className="mb-5 flex items-center justify-between"><h1 className="text-2xl font-black tracking-tight">Home</h1><Link className="button button-primary !min-h-9 !px-3 !text-xs sm:hidden" href="/post"><FiPlus /> Post</Link></div>

        <section className="surface mb-4 p-4">
          <div className="flex items-center gap-3">
            <div className="avatar !h-10 !w-10">{profile.avatar_url ? <AvatarImage alt={profile.full_name} src={profile.avatar_url} /> : initials(profile.full_name)}</div>
            <Link className="field flex !min-h-10 flex-1 items-center !rounded-full !py-0 text-sm text-muted hover:border-white/15" href="/post">Start a post</Link>
          </div>
          <div className="mt-3 grid grid-cols-3 border-t border-white/6 pt-2 text-xs font-semibold text-muted">
            <Link className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-white/5 hover:text-font" href="/post"><FiImage className="text-secondary" /> Photo</Link>
            <Link className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-white/5 hover:text-font" href="/post"><FiVideo className="text-primary" /> Video</Link>
            <Link className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-white/5 hover:text-font" href="/post"><FiFileText /> Document</Link>
          </div>
        </section>

        <div className="space-y-4">
          {posts.length ? posts.map((post) => <SocialPostCard key={post.id} post={post} />) : (
            <EmptyState icon={<FiFileText size={21} />} title="No posts yet" copy="Share the first update with the NST community." action={<Link className="button button-primary" href="/post">Create a post</Link>} />
          )}
        </div>
      </div>

      <aside className="hidden lg:block">
        <section className="surface sticky top-4 p-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Suggested for you</h2><FiUsers className="text-muted" /></div>
          <div className="mt-2 divide-y divide-white/6">
            {suggestions.length ? suggestions.map((student) => <SuggestedStudent currentId={user.id} isFollowing={following.has(student.id)} key={student.id} student={student} />) : <p className="py-5 text-xs leading-5 text-muted">No new suggestions right now.</p>}
          </div>
          <Link className="mt-3 block border-t border-white/6 pt-3 text-xs font-bold text-primary" href="/discover">See more students</Link>
        </section>
      </aside>
    </div>
  );
}
