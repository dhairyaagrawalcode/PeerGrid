import type { ReactNode } from "react";
import Link from "next/link";
import {
  FiExternalLink,
  FiCheck,
  FiGithub,
  FiLinkedin,
  FiMapPin,
  FiMessageCircle,
  FiShield,
} from "react-icons/fi";
import { confirmCollaborationParticipation } from "@/app/actions/collaborations";
import { startConversation } from "@/app/actions/messages";
import { initials } from "@/app/lib/format";
import type { CollaborationProof, FollowSummary, MutualFollowContext, PendingCollaborationConfirmation, SocialPost, StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import PageNavigation from "./page-navigation";
import FollowControls from "./follow-controls";
import SocialPostCard from "./social-post-card";
import MutualConnections from "./mutual-connections";

export default function ProfileView({
  profile,
  currentId,
  followSummary,
  posts = [],
  postsContent,
  proofsContent,
  pendingContent,
  mutualContent,
  own = false,
  page = 0,
  hasMorePosts = false,
  proofs = [],
  pendingConfirmations = [],
  mutualContext,
}: {
  profile: StudentProfile;
  currentId: string;
  followSummary: FollowSummary;
  posts?: SocialPost[];
  postsContent?: ReactNode;
  proofsContent?: ReactNode;
  pendingContent?: ReactNode;
  mutualContent?: ReactNode;
  own?: boolean;
  page?: number;
  hasMorePosts?: boolean;
  proofs?: CollaborationProof[];
  pendingConfirmations?: PendingCollaborationConfirmation[];
  mutualContext?: MutualFollowContext | null;
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
              <div className="min-w-0">
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
                <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
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
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {own ? <Link className="hover:text-font" href="/connections?view=followers#followers"><strong className="text-font">{followSummary.follower_count}</strong> follower{followSummary.follower_count === 1 ? "" : "s"}</Link> : <span><strong className="text-font">{followSummary.follower_count}</strong> follower{followSummary.follower_count === 1 ? "" : "s"}</span>}
              {own ? <Link className="hover:text-font" href="/connections?view=following#following"><strong className="text-font">{followSummary.following_count}</strong> following</Link> : <span><strong className="text-font">{followSummary.following_count}</strong> following</span>}
            </div>
            {!own && (mutualContent ?? <MutualConnections className="mt-2" context={mutualContext} />)}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {profile.campus?.name && <span className="flex items-center gap-1.5"><FiMapPin className="text-secondary" />{profile.campus.name}</span>}
              {profile.program && <span>{profile.program}</span>}
              {profile.graduation_year && <span>Class of {profile.graduation_year}</span>}
            </div>
            <div className="mt-5 grid max-w-2xl gap-5 sm:grid-cols-2"><div><p className="eyebrow">Current status</p><p className="mt-2 text-sm leading-6 text-subtle">{profile.current_status || "No current status shared."}</p></div><div><p className="eyebrow">Bio</p><p className="mt-2 text-sm leading-6 text-subtle">{profile.bio || "No bio added yet."}</p></div></div>
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

      <section className="mt-9"><h2 className="text-lg font-bold">Skills &amp; interests</h2><p className="mt-1 text-xs text-muted">What {own ? "you know and want to explore" : `${profile.full_name} knows and wants to explore`}.</p></section>
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <section>
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
        <section>
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
      <section className="mt-10"><h2 className="text-lg font-bold">Ways to collaborate</h2><p className="mt-1 text-xs text-muted">Help offered, support needed, and current goals.</p></section>
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <section>
          <p className="eyebrow">I can help with</p>
          {profile.can_help_with?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.can_help_with.map((item) => <span className="chip" key={item.id}>{item.name}</span>)}
            </div>
          ) : <p className="mt-4 text-sm text-muted">Nothing shared yet.</p>}
        </section>
        <section>
          <p className="eyebrow">I need help with</p>
          {profile.needs_help_with?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.needs_help_with.map((item) => <span className="chip" key={item.id}>{item.name}</span>)}
            </div>
          ) : <p className="mt-4 text-sm text-muted">Nothing shared yet.</p>}
        </section>
      </div>
      <section className="mt-7">
        <p className="eyebrow">Currently looking for</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-subtle">
          {profile.goals || "Nothing specific shared yet."}
        </p>
      </section>
      {pendingContent ?? <ProfileConfirmations pendingConfirmations={pendingConfirmations} />}
      {proofsContent ?? <ProfileProofs proofs={proofs} currentId={currentId} />}
      {postsContent ?? <ProfilePosts posts={posts} page={page} hasMorePosts={hasMorePosts} own={own} profile={profile} />}

    </div>
  );
}

export function ProfileConfirmations({ pendingConfirmations }: { pendingConfirmations: PendingCollaborationConfirmation[] }) {
  return (<>      {pendingConfirmations.length > 0 && (
        <section className="mt-10">
          <p className="eyebrow">Participation confirmations</p>
          <div className="mt-4 space-y-4">
            {pendingConfirmations.map((confirmation) => (
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" key={confirmation.passport_id}>
                <div>
                  <p className="text-sm font-semibold">{confirmation.passport.project_name}</p>
                  <p className="mt-1 text-xs text-muted">Added by {confirmation.passport.creator.full_name} as {confirmation.role} · {confirmation.passport.duration}</p>
                </div>
                <div className="flex gap-2">
                  <form action={confirmCollaborationParticipation}><input name="passportId" type="hidden" value={confirmation.passport_id} /><input name="decision" type="hidden" value="confirm" /><input name="returnTo" type="hidden" value="/profile" /><button className="button button-primary !min-h-9 !px-3 !text-xs" type="submit"><FiCheck /> Confirm</button></form>
                  <form action={confirmCollaborationParticipation}><input name="passportId" type="hidden" value={confirmation.passport_id} /><input name="decision" type="hidden" value="decline" /><input name="returnTo" type="hidden" value="/profile" /><button className="button button-secondary !min-h-9 !px-3 !text-xs" type="submit">Decline</button></form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
</>);
}

export function ProfileProofs({ proofs, currentId }: { proofs: CollaborationProof[]; currentId: string }) {
  return (      <section className="mt-10 border-t border-line pt-8">
        <div className="flex items-center justify-between"><div><p className="eyebrow">Collaborations</p><h2 className="mt-2 text-lg font-bold">Proof of work</h2></div><span className="text-xs text-muted">{proofs.length}</span></div>
        {proofs.length ? (
          <div className="mt-4 divide-y divide-line">
            {proofs.map((proof) => (
              <article className="py-5" key={proof.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div><h3 className="text-sm font-bold">{proof.project_name}</h3><p className="mt-1 text-xs text-muted">Completed {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(proof.completion_date))} · {proof.duration}</p></div>
                  {proof.project_url && <a className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover" href={proof.project_url} rel="noreferrer" target="_blank">View project <FiExternalLink /></a>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{proof.skills_used.map((skill) => <span className="chip" key={skill}>{skill}</span>)}</div>
                {proof.outcome && <p className="mt-3 max-w-3xl text-sm leading-6 text-subtle">{proof.outcome}</p>}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                  {proof.participants.map((participant) => <Link className="hover:text-font" href={participant.id === currentId ? "/profile" : `/students/${participant.username}`} key={participant.id}><span className="font-semibold text-subtle">{participant.full_name}</span> · {participant.role}</Link>)}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-muted">No verified collaborations yet.</p>}
      </section>
);
}

export function ProfilePosts({ posts, page, proofPage = 0, hasMorePosts, own, profile }: {
  posts: SocialPost[]; page: number; proofPage?: number; hasMorePosts: boolean; own: boolean; profile: StudentProfile;
}) {
  return (      <section className="mt-10 border-t border-line pt-8">
        <div className="mb-4 flex items-center justify-between">
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
          <div className="px-5 py-10 text-center text-sm text-muted">
            No posts yet.
          </div>
        )}
        <PageNavigation
          hasMore={hasMorePosts}
          page={page}
          path={own ? "/profile" : `/students/${profile.username}`}
          query={{ proofPage: String(proofPage) }}
        />
      </section>);
}
