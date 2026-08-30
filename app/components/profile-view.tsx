import Link from "next/link";
import {
  FiExternalLink,
  FiGithub,
  FiLinkedin,
  FiMapPin,
  FiMessageCircle,
  FiShield,
} from "react-icons/fi";
import { startConversation } from "@/app/actions/messages";
import { initials } from "@/app/lib/format";
import type { FollowSummary, SocialPost, StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import FollowControls from "./follow-controls";
import SocialPostCard from "./social-post-card";

export default function ProfileView({
  profile,
  currentId,
  followSummary,
  posts,
  own = false,
}: {
  profile: StudentProfile;
  currentId: string;
  followSummary: FollowSummary;
  posts: SocialPost[];
  own?: boolean;
}) {
  return (
    <div className="mx-auto max-w-[920px]">
      <section className="border-b border-line pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="avatar !h-24 !w-24 !rounded-full text-xl sm:!h-28 sm:!w-28">
            {profile.avatar_url ? (
              <AvatarImage alt={profile.full_name} src={profile.avatar_url} />
            ) : (
              initials(profile.full_name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    {profile.full_name}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <FiShield /> Verified
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">@{profile.username}</p>
              </div>
              {own ? (
                <Link className="button button-secondary self-start !min-h-10" href="/profile/edit">
                  Edit profile
                </Link>
              ) : (
                <div className="flex items-center gap-2 self-start">
                  <FollowControls
                    currentId={currentId}
                    isFollowing={followSummary.viewer_follows}
                    targetId={profile.id}
                  />
                  <form action={startConversation}>
                    <input name="otherUserId" type="hidden" value={profile.id} />
                    <button className="button button-secondary" type="submit">
                      <FiMessageCircle /> Message
                    </button>
                  </form>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-6 text-sm text-muted">
              <span><strong className="text-font">{followSummary.follower_count}</strong> follower{followSummary.follower_count === 1 ? "" : "s"}</span>
              <span><strong className="text-font">{followSummary.following_count}</strong> following</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {profile.campus?.name && <span className="flex items-center gap-1.5"><FiMapPin className="text-secondary" />{profile.campus.name}</span>}
              {profile.program && <span>{profile.program}</span>}
              {profile.graduation_year && <span>Class of {profile.graduation_year}</span>}
            </div>
            {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-subtle">{profile.bio}</p>}
            {(profile.github_url || profile.linkedin_url || profile.portfolio_url) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold">
                {profile.github_url && <a className="flex items-center gap-1.5 text-muted hover:text-font" href={profile.github_url} target="_blank" rel="noreferrer"><FiGithub /> GitHub</a>}
                {profile.linkedin_url && <a className="flex items-center gap-1.5 text-muted hover:text-font" href={profile.linkedin_url} target="_blank" rel="noreferrer"><FiLinkedin /> LinkedIn</a>}
                {profile.portfolio_url && <a className="flex items-center gap-1.5 text-muted hover:text-font" href={profile.portfolio_url} target="_blank" rel="noreferrer"><FiExternalLink /> Portfolio</a>}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid border-b border-line md:grid-cols-2">
        <section className="py-7 md:pr-8">
          <p className="eyebrow">Skills</p>
          {profile.skills?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((item) => (
                <span className="chip !text-secondary" key={item.id}>
                  {item.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No skills added yet.</p>
          )}
        </section>
        <section className="border-t border-line py-7 md:border-l md:border-t-0 md:pl-8">
          <p className="eyebrow">Interests</p>
          {profile.interests?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.map((item) => (
                <span className="chip" key={item.id}>
                  {item.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No interests added yet.</p>
          )}
        </section>
      </div>
      <section className="border-b border-line py-7">
        <p className="eyebrow">Currently looking for</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-subtle">
          {profile.goals || "Nothing specific shared yet."}
        </p>
      </section>
      <section className="pt-7">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-bold">Posts</h2>
          <span className="text-xs text-muted">{posts.length}</span>
        </div>
        {posts.length ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <SocialPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="border-b border-line px-5 py-10 text-center text-sm text-muted">
            No posts yet.
          </div>
        )}
      </section>
    </div>
  );
}
