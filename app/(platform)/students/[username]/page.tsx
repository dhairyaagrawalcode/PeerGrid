import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProfileView from "@/app/components/profile-view";
import { ProfileMutualSection, ProfilePostSection, ProfileProofSection } from "@/app/components/profile-sections";
import { ProfilePostsSkeleton, ProfileProofsSkeleton } from "@/app/components/section-skeleton";
import { requireStudent } from "@/app/lib/auth";
import { getFollowSummary, getStudent } from "@/app/lib/data";

export default async function StudentPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ page?: string; proofPage?: string }> }) {
  const { username } = await params;
  const query = await searchParams;
  const rawPage = Number(query.page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const rawProofPage = Number(query.proofPage ?? 0);
  const proofPage = Number.isSafeInteger(rawProofPage) && rawProofPage > 0 ? rawProofPage : 0;
  const { supabase, user, profile: viewer } = await requireStudent();
  const profile = username.toLowerCase() === viewer.username.toLowerCase() ? viewer : await getStudent(supabase, { username });
  if (!profile?.is_verified) notFound();
  const followSummary = await getFollowSummary(supabase, profile.id);
  return <div className="app-page"><ProfileView currentId={user.id} followSummary={followSummary} own={profile.id === user.id} profile={profile}
    mutualContent={<Suspense fallback={null}><ProfileMutualSection profileId={profile.id} /></Suspense>}
    proofsContent={<Suspense key={proofPage} fallback={<ProfileProofsSkeleton />}><ProfileProofSection profile={profile} page={proofPage} postPage={page} /></Suspense>}
    postsContent={<Suspense key={page} fallback={<ProfilePostsSkeleton />}><ProfilePostSection profile={profile} page={page} proofPage={proofPage} /></Suspense>}
  /></div>;
}
