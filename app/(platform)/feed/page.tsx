import Link from "next/link";
import { FiFileText, FiImage, FiPlus, FiUsers, FiVideo } from "react-icons/fi";
import AvatarImage from "@/app/components/avatar-image";
import EmptyState from "@/app/components/empty-state";
import SocialPostCard from "@/app/components/social-post-card";
import SuggestedStudent from "@/app/components/suggested-student";
import { requireStudent } from "@/app/lib/auth";
import {
  getFollowSummary,
  getFollows,
  getSocialPosts,
  getStudent,
  getStudents,
} from "@/app/lib/data";
import { initials } from "@/app/lib/format";

export default async function FeedPage() {
  const { supabase, user, profile } = await requireStudent();
  const [posts, follows, students, completeProfile, followSummary] = await Promise.all([
    getSocialPosts(supabase, { limit: 30 }),
    getFollows(supabase, user.id),
    getStudents(supabase, user.id),
    getStudent(supabase, { id: user.id }),
    getFollowSummary(supabase, user.id),
  ]);

  const following = new Set(
    follows
      .filter((item) => item.follower_id === user.id)
      .map((item) => item.following_id),
  );
  const ownSkills = new Set(completeProfile?.skills?.map((item) => item.id) ?? []);
  const ownInterests = new Set(completeProfile?.interests?.map((item) => item.id) ?? []);
  const suggestions = students
    .filter((student) => !following.has(student.id))
    .map((student) => ({
      student,
      score:
        (student.campus_id === profile.campus_id ? 5 : 0) +
        (student.skills?.filter((item) => ownSkills.has(item.id)).length ?? 0) +
        (student.interests?.filter((item) => ownInterests.has(item.id)).length ?? 0) * 2,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.student.full_name.localeCompare(b.student.full_name),
    )
    .slice(0, 4)
    .map((item) => item.student);

  return (
    <div className="mx-auto grid max-w-[1240px] gap-5 xl:grid-cols-[280px_minmax(0,620px)_280px]">
      <aside className="hidden xl:block">
        <section className="surface sticky top-0 overflow-hidden !rounded-2xl">
          <div className="relative h-40 bg-[radial-gradient(circle_at_25%_20%,rgba(153,89,255,.55),transparent_35%),linear-gradient(145deg,#4716a4,#19102f)]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_38%,rgba(153,54,255,.42)_38%,rgba(153,54,255,.42)_64%,transparent_64%)]" />
            <div className="absolute inset-x-0 bottom-[-2.6rem] flex justify-center">
              <span className="avatar !h-21 !w-21 !rounded-2xl !border-[3px] !border-panel text-lg">
                {profile.avatar_url ? (
                  <AvatarImage alt={profile.full_name} src={profile.avatar_url} />
                ) : (
                  initials(profile.full_name)
                )}
              </span>
            </div>
          </div>
          <div className="px-5 pb-5 pt-13 text-center">
            <h2 className="truncate text-base font-bold">{profile.full_name}</h2>
            <p className="mt-1 truncate text-[11px] text-muted">
              {profile.program || `@${profile.username}`} · {profile.campus?.name}
            </p>
            <div className="mt-5 grid grid-cols-2 border-y border-white/8 py-3">
              <div>
                <strong className="block text-sm">{followSummary.follower_count}</strong>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Followers</span>
              </div>
              <div className="border-l border-white/8">
                <strong className="block text-sm">{followSummary.following_count}</strong>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Following</span>
              </div>
            </div>
            <Link className="button button-secondary mt-4 w-full !min-h-10 !text-xs !text-primary" href="/profile">
              View profile
            </Link>
          </div>
        </section>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between xl:hidden">
          <h1 className="text-xl font-black tracking-tight">Home</h1>
          <Link className="button button-primary !min-h-9 !px-3 !text-xs sm:hidden" href="/post">
            <FiPlus /> Post
          </Link>
        </div>

        <section className="surface mb-5 !rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="avatar !h-10 !w-10 !rounded-full">
              {profile.avatar_url ? (
                <AvatarImage alt={profile.full_name} src={profile.avatar_url} />
              ) : (
                initials(profile.full_name)
              )}
            </div>
            <Link className="field flex !min-h-11 flex-1 items-center !rounded-xl !py-0 text-sm text-muted hover:border-primary/25" href="/post">
              Share something with the NST community…
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 border-t border-white/8 pt-3 text-xs font-semibold text-muted">
            <Link className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-white/5 hover:text-font" href="/post">
              <FiImage className="text-primary" /> Photo
            </Link>
            <Link className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-white/5 hover:text-font" href="/post">
              <FiVideo className="text-primary" /> Video
            </Link>
            <Link className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-white/5 hover:text-font" href="/post">
              <FiFileText className="text-primary" /> Document
            </Link>
          </div>
        </section>

        <div className="space-y-5">
          {posts.length ? (
            posts.map((post) => <SocialPostCard key={post.id} post={post} />)
          ) : (
            <EmptyState
              action={<Link className="button button-primary" href="/post">Create a post</Link>}
              copy="Share the first update with the NST community."
              icon={<FiFileText size={21} />}
              title="No posts yet"
            />
          )}
        </div>
      </div>

      <aside className="hidden xl:block">
        <section className="surface sticky top-0 !rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Suggested for you</h2>
            <Link className="text-[10px] font-bold text-primary hover:text-[#a982ff]" href="/discover">See all</Link>
          </div>
          <div className="mt-2 divide-y divide-white/6">
            {suggestions.length ? (
              suggestions.map((student) => (
                <SuggestedStudent
                  currentId={user.id}
                  isFollowing={following.has(student.id)}
                  key={student.id}
                  student={student}
                />
              ))
            ) : (
              <p className="py-5 text-xs leading-5 text-muted">No new suggestions right now.</p>
            )}
          </div>
          <Link className="mt-3 flex items-center gap-2 border-t border-white/6 pt-3 text-xs font-bold text-primary" href="/discover">
            <FiUsers /> Explore the network
          </Link>
        </section>
      </aside>
    </div>
  );
}
