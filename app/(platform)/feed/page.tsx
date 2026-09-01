import Link from "next/link";
import { FiFileText, FiImage, FiPlus, FiUsers, FiVideo } from "react-icons/fi";
import AvatarImage from "@/app/components/avatar-image";
import EmptyState from "@/app/components/empty-state";
import SocialPostCard from "@/app/components/social-post-card";
import SuggestedStudent from "@/app/components/suggested-student";
import PageNavigation from "@/app/components/page-navigation";
import { requireStudent } from "@/app/lib/auth";
import {
  getFollowSummary,
  getCollaborations,
  getProfileMatches,
  getSocialPosts,
  POST_PAGE_SIZE,
} from "@/app/lib/data";
import { initials } from "@/app/lib/format";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const rawPage = Number((await searchParams).page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const { supabase, user, profile } = await requireStudent();
  const [posts, suggestions, followSummary, rankedCollaborations] =
    await Promise.all([
      getSocialPosts(supabase, { limit: POST_PAGE_SIZE + 1, offset: page * POST_PAGE_SIZE, ranked: true }),
      getProfileMatches(supabase, 4),
      getFollowSummary(supabase, user.id),
      getCollaborations(supabase, { status: "open", limit: 6, ranked: true }),
    ]);
  const hasMorePosts = posts.length > POST_PAGE_SIZE;
  const visiblePosts = posts.slice(0, POST_PAGE_SIZE);
  const collaborationSuggestions = rankedCollaborations
    .filter((collaboration) => collaboration.author_id !== user.id)
    .slice(0, 3);

  return (
    <div className="app-page grid gap-5 xl:grid-cols-[280px_minmax(0,620px)_280px]">
      <aside className="hidden xl:block">
        <section className="surface sticky top-0 p-5 text-center !rounded-2xl">
          <Link className="avatar mx-auto !h-20 !w-20 !rounded-full text-lg transition hover:ring-2 hover:ring-primary/25" href="/profile">
            {profile.avatar_url ? (
              <AvatarImage alt={profile.full_name} src={profile.avatar_url} />
            ) : (
              initials(profile.full_name)
            )}
          </Link>
          <div className="mt-4">
            <h2 className="truncate text-base font-bold">
              {profile.full_name}
            </h2>
            <p className="mt-1 truncate text-[11px] text-muted">
              {profile.program || `@${profile.username}`} ·{" "}
              {profile.campus?.name}
            </p>
            <div className="mt-5 grid grid-cols-2 border-t border-line pt-3">
              <div>
                <strong className="block text-sm">
                  {followSummary.follower_count}
                </strong>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                  Followers
                </span>
              </div>
              <div className="border-l border-line pl-5">
                <strong className="block text-sm">
                  {followSummary.following_count}
                </strong>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                  Following
                </span>
              </div>
            </div>
            <Link
              className="button button-secondary mt-4 w-full !min-h-10 !text-xs !text-primary"
              href="/profile"
            >
              View profile
            </Link>
          </div>
        </section>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between xl:hidden">
          <h1 className="text-xl font-black tracking-tight">Home</h1>
          <Link
            className="button button-primary !min-h-9 !px-3 !text-xs sm:hidden"
            href="/post"
          >
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
            <Link
              className="field flex !min-h-11 flex-1 items-center !rounded-xl !py-0 text-sm text-muted hover:border-primary/25"
              href="/post"
            >
              What are you building or learning?
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 border-t border-line pt-3 text-xs font-semibold text-muted">
            <Link
              className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-card hover:text-font"
              href="/post"
            >
              <FiImage className="text-subtle" /> Photo
            </Link>
            <Link
              className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-card hover:text-font"
              href="/post"
            >
              <FiVideo className="text-subtle" /> Video
            </Link>
            <Link
              className="flex items-center justify-center gap-2 rounded-lg py-2 hover:bg-card hover:text-font"
              href="/post"
            >
              <FiFileText className="text-subtle" /> Document
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          {visiblePosts.length ? (
            visiblePosts.map((post) => <SocialPostCard key={post.id} post={post} />)
          ) : (
            <EmptyState
              action={
                <Link className="button button-primary" href="/post">
                  Create a post
                </Link>
              }
              copy="Share a project, learning milestone, opportunity, or update with the NST community."
              icon={<FiFileText size={21} />}
              title="No posts yet"
            />
          )}
        </div>
        <PageNavigation hasMore={hasMorePosts} page={page} path="/feed" />
      </div>

      <aside className="hidden xl:block">
        <section className="surface sticky top-0 !rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">People you should meet</h2>
            <Link
              className="text-[10px] font-bold text-primary hover:text-primary-hover"
              href="/discover"
            >
              See all
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {suggestions.length ? (
              suggestions.map(({ student, reason }) => (
                <SuggestedStudent
                  currentId={user.id}
                  isFollowing={false}
                  key={student.id}
                  reason={reason}
                  student={student}
                />
              ))
            ) : (
              <p className="py-5 text-xs leading-5 text-muted">
                No new suggestions right now.
              </p>
            )}
          </div>
          <Link
            className="mt-3 flex items-center gap-2 pt-2 text-xs font-bold text-primary"
            href="/discover"
          >
            <FiUsers /> Explore the network
          </Link>
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Collaborations for you</h2>
              <Link className="text-[10px] font-bold text-primary hover:text-primary-hover" href="/collaborate">See all</Link>
            </div>
            {collaborationSuggestions.length ? <div className="mt-3 space-y-4">
              {collaborationSuggestions.map((collaboration) => {
                const openings = collaboration.team_capacity === null ? null : Math.max(collaboration.team_capacity - collaboration.team_current, 0);
                const type = collaboration.collaboration_type === "study" ? "Study group" : collaboration.collaboration_type.replace("_", " ");
                return <Link className="block group" href={`/collaborate#collaboration-${collaboration.id}`} key={collaboration.id}>
                  <p className="line-clamp-2 text-xs font-bold leading-5 group-hover:text-primary">{collaboration.title}</p>
                  <p className="mt-1 text-[10px] capitalize text-muted">{type}{openings !== null ? ` · ${openings} opening${openings === 1 ? "" : "s"}` : ""}</p>
                  {collaboration.required_skills.length > 0 && <p className="mt-1 truncate text-[10px] text-subtle">{collaboration.required_skills.slice(0, 2).join(" · ")}</p>}
                  {collaboration.recommendation_reason && <p className="mt-1 text-[10px] text-primary">{collaboration.recommendation_reason}</p>}
                </Link>;
              })}
            </div> : <p className="mt-3 text-xs leading-5 text-muted">No matching open collaborations right now.</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}
