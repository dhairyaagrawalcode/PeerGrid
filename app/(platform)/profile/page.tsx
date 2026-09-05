import { Suspense } from "react";
import ProfileView from "@/app/components/profile-view";
import { ProfilePendingSection, ProfilePostSection, ProfileProofSection } from "@/app/components/profile-sections";
import { ProfileConfirmationsSkeleton, ProfilePostsSkeleton, ProfileProofsSkeleton } from "@/app/components/section-skeleton";
import { requireStudent } from "@/app/lib/auth";
import { getFollowSummary } from "@/app/lib/data";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ page?: string; proofPage?: string; confirmation?: string }> }) {
  const params = await searchParams;
  const rawPage = Number(params.page ?? 0);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const rawProofPage = Number(params.proofPage ?? 0);
  const proofPage = Number.isSafeInteger(rawProofPage) && rawProofPage > 0 ? rawProofPage : 0;
  const { supabase, user, profile } = await requireStudent();
  const followSummary = await getFollowSummary(supabase, user.id);
  return <div className="app-page">
    {params.confirmation === "error" && <p className="mx-auto mb-5 max-w-[920px] rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">Could not update this collaboration confirmation. Apply the latest Supabase migration, then try again.</p>}
    <ProfileView currentId={user.id} followSummary={followSummary} own profile={profile}
      pendingContent={<Suspense fallback={<ProfileConfirmationsSkeleton />}><ProfilePendingSection /></Suspense>}
      proofsContent={<Suspense key={proofPage} fallback={<ProfileProofsSkeleton />}><ProfileProofSection profile={profile} page={proofPage} postPage={page} /></Suspense>}
      postsContent={<Suspense key={page} fallback={<ProfilePostsSkeleton />}><ProfilePostSection profile={profile} page={page} proofPage={proofPage} /></Suspense>}
    />
  </div>;
}
