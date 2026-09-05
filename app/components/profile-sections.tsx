import { requireStudent } from "@/app/lib/auth";
import { getCollaborationProofs, getMutualFollowContexts, getPendingCollaborationConfirmations, getSocialPosts, POST_PAGE_SIZE } from "@/app/lib/data";
import type { StudentProfile } from "@/app/types";
import { ProfileConfirmations, ProfilePosts, ProfileProofs } from "./profile-view";
import MutualConnections from "./mutual-connections";
import PageNavigation from "./page-navigation";

export async function ProfilePostSection({ profile, page, proofPage }: { profile: StudentProfile; page: number; proofPage: number }) {
  const { supabase, user } = await requireStudent();
  const posts = await getSocialPosts(supabase, { authorId: profile.id, limit: POST_PAGE_SIZE + 1, offset: page * POST_PAGE_SIZE });
  return <ProfilePosts posts={posts.slice(0, POST_PAGE_SIZE)} hasMorePosts={posts.length > POST_PAGE_SIZE} own={user.id === profile.id} profile={profile} page={page} proofPage={proofPage} />;
}

export async function ProfileProofSection({ profile, page, postPage }: { profile: StudentProfile; page: number; postPage: number }) {
  const { supabase, user } = await requireStudent();
  const proofs = await getCollaborationProofs(supabase, profile.id, { limit: 13, offset: page * 12 });
  return <><ProfileProofs proofs={proofs.slice(0, 12)} currentId={user.id} /><PageNavigation hasMore={proofs.length > 12} page={page} parameter="proofPage" query={{ page: String(postPage) }} path={profile.id === user.id ? "/profile" : `/students/${profile.username}`} /></>;
}

export async function ProfilePendingSection() {
  const { supabase, user } = await requireStudent();
  return <ProfileConfirmations pendingConfirmations={await getPendingCollaborationConfirmations(supabase, user.id)} />;
}

export async function ProfileMutualSection({ profileId }: { profileId: string }) {
  const { supabase } = await requireStudent();
  const contexts = await getMutualFollowContexts(supabase, [profileId]);
  return <MutualConnections className="mt-2" context={contexts.get(profileId)} />;
}
