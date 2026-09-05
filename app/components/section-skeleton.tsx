import type { ReactNode } from "react";

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`max-w-full rounded bg-line ${className}`} />;
}

export function SkeletonRegion({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return <div aria-busy="true" aria-label={label} className={`motion-safe:animate-pulse ${className}`} role="status">
    <div aria-hidden="true">{children}</div>
    <span className="sr-only">{label}…</span>
  </div>;
}

export function PersonSkeleton({ compact = false }: { compact?: boolean }) {
  return <div className={`min-w-0 gap-3 ${compact ? "flex items-center py-3" : "grid grid-cols-[auto_minmax(0,1fr)] items-start py-4 sm:flex sm:items-center"}`}>
    <SkeletonBar className={`${compact ? "h-9 w-9" : "h-12 w-12"} shrink-0 rounded-full`} />
    <div className="min-w-0 flex-1 space-y-2">
      <SkeletonBar className="h-4 w-36" /><SkeletonBar className="h-3 w-48" />
      {!compact && <SkeletonBar className="h-3 w-32" />}
    </div>
    <SkeletonBar className={`${compact ? "h-7 w-7" : "col-start-2 h-9 w-20"} shrink-0 rounded-lg`} />
  </div>;
}

export function PostSkeleton({ media = false }: { media?: boolean }) {
  return <div className="surface space-y-4 overflow-hidden p-4 sm:p-5">
    <div className="flex items-center gap-3"><SkeletonBar className="h-11 w-11 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><SkeletonBar className="h-4 w-36" /><SkeletonBar className="h-3 w-24" /></div></div>
    <div className="space-y-2"><SkeletonBar className="h-4 w-full" /><SkeletonBar className="h-4 w-4/5" /><SkeletonBar className="h-4 w-2/3" /></div>
    {media && <SkeletonBar className="aspect-[4/3] w-full rounded-xl" />}
    <div className="flex gap-5 pt-2"><SkeletonBar className="h-4 w-14" /><SkeletonBar className="h-4 w-20" /></div>
  </div>;
}

export function FeedPostsSkeleton() {
  return <SkeletonRegion label="Loading posts"><div className="space-y-4"><PostSkeleton media /><PostSkeleton /></div></SkeletonRegion>;
}

export function FeedProfileSkeleton() {
  return <SkeletonRegion label="Loading your profile" className="surface !rounded-2xl p-4">
    <div className="flex items-center gap-3"><SkeletonBar className="h-16 w-16 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><SkeletonBar className="h-4 w-full" /><SkeletonBar className="h-3 w-4/5" /><SkeletonBar className="h-3 w-20" /></div></div>
    <div className="mt-4 space-y-2"><SkeletonBar className="h-3 w-36" /><SkeletonBar className="h-3 w-28" /></div>
    <div className="mt-4 space-y-2"><SkeletonBar className="h-3 w-20" /><SkeletonBar className="h-4 w-full" /></div>
    <div className="mt-3 flex gap-2">{[0, 1, 2].map(item => <SkeletonBar className="h-6 w-14 rounded-full" key={item} />)}</div>
    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">{[0, 1].map(item => <div className="space-y-2" key={item}><SkeletonBar className="h-4 w-8" /><SkeletonBar className="h-3 w-20" /></div>)}</div>
  </SkeletonRegion>;
}

export function FeedPeopleSkeleton() {
  return <SkeletonRegion label="Loading suggested people"><SkeletonBar className="h-5 w-44" /><div className="mt-2 divide-y divide-line">{[0, 1, 2].map(item => <PersonSkeleton compact key={item} />)}</div><SkeletonBar className="mt-4 h-3 w-36" /></SkeletonRegion>;
}

export function FeedCollaborationsSkeleton() {
  return <SkeletonRegion label="Loading suggested collaborations" className="mt-5 border-t border-line pt-5"><SkeletonBar className="h-5 w-44" /><div className="mt-3 space-y-4">{[0, 1, 2].map(item => <div className="space-y-2" key={item}><SkeletonBar className="h-4 w-full" /><SkeletonBar className="h-3 w-3/4" /><SkeletonBar className="h-3 w-1/2" /></div>)}</div></SkeletonRegion>;
}

export function ProfileProofsSkeleton() {
  return <SkeletonRegion label="Loading proof of work" className="mt-10 border-t border-line pt-8"><SkeletonBar className="h-3 w-28" /><SkeletonBar className="mt-3 h-6 w-36" /><div className="mt-6 space-y-3"><SkeletonBar className="h-4 w-56" /><SkeletonBar className="h-3 w-44" /><SkeletonBar className="h-4 w-3/4" /><div className="flex gap-2"><SkeletonBar className="h-7 w-16 rounded-full" /><SkeletonBar className="h-7 w-20 rounded-full" /></div></div></SkeletonRegion>;
}

export function ProfilePostsSkeleton() {
  return <SkeletonRegion label="Loading profile posts" className="mt-10 border-t border-line pt-8"><SkeletonBar className="mb-4 h-6 w-20" /><PostSkeleton media /></SkeletonRegion>;
}

export function ProfileConfirmationsSkeleton() {
  return <SkeletonRegion label="Loading participation confirmations" className="mt-10"><SkeletonBar className="h-3 w-52" /><div className="mt-4 flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0 space-y-2"><SkeletonBar className="h-4 w-56" /><SkeletonBar className="h-3 w-72" /></div><div className="flex gap-2"><SkeletonBar className="h-9 w-20 rounded-lg" /><SkeletonBar className="h-9 w-20 rounded-lg" /></div></div></SkeletonRegion>;
}
