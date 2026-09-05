import type { PageSkeletonKind } from "@/app/lib/loading-layout";
import {
  FeedCollaborationsSkeleton, FeedPeopleSkeleton, FeedPostsSkeleton, FeedProfileSkeleton,
  PersonSkeleton, ProfilePostsSkeleton, ProfileProofsSkeleton, SkeletonBar as Bar, SkeletonRegion,
} from "./section-skeleton";

function HeadingSkeleton() {
  return <div><Bar className="h-3 w-24" /><Bar className="mt-3 h-8 w-72" /><Bar className="mt-3 h-4 w-[36rem]" /></div>;
}

function FieldSkeleton({ multiline = false }: { multiline?: boolean }) {
  return <div className="min-w-0 space-y-2"><Bar className="h-3 w-24" /><Bar className={`${multiline ? "h-24" : "h-12"} w-full rounded-xl`} /></div>;
}

function FeedSkeleton() {
  return <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,620px)_280px]">
    <aside className="hidden xl:block"><FeedProfileSkeleton /></aside>
    <div className="min-w-0">
      <Bar className="mb-4 h-7 w-20 xl:hidden" />
      <div className="surface mb-5 !rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3"><Bar className="h-10 w-10 shrink-0 rounded-full" /><Bar className="h-11 flex-1 rounded-xl" /></div>
        <div className="mt-3 grid grid-cols-3 gap-5 border-t border-line pt-5 pb-2">{[0, 1, 2].map(item => <Bar className="mx-auto h-4 w-20" key={item} />)}</div>
      </div>
      <FeedPostsSkeleton />
    </div>
    <aside className="hidden xl:block"><div className="surface !rounded-2xl p-4"><FeedPeopleSkeleton /><FeedCollaborationsSkeleton /></div></aside>
  </div>;
}

function ProfileSkeleton() {
  return <div className="mx-auto max-w-[920px]">
    <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:gap-6">
      <Bar className="h-24 w-24 shrink-0 rounded-full sm:h-28 sm:w-28" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap justify-between gap-4"><div><Bar className="h-8 w-64" /><Bar className="mt-2 h-4 w-36" /></div><Bar className="h-10 w-28 rounded-xl" /></div>
        <div className="mt-5 flex gap-6"><Bar className="h-4 w-24" /><Bar className="h-4 w-24" /></div>
        <div className="mt-5 flex flex-wrap gap-4"><Bar className="h-4 w-32" /><Bar className="h-4 w-28" /><Bar className="h-4 w-24" /></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">{[0, 1].map(item => <div className="space-y-3" key={item}><Bar className="h-3 w-24" /><Bar className="h-4 w-full" /><Bar className="h-4 w-3/4" /></div>)}</div>
        <div className="mt-4 flex gap-5"><Bar className="h-3 w-16" /><Bar className="h-3 w-20" /><Bar className="h-3 w-20" /></div>
      </div>
    </div>
    {[0, 1].map(group => <div className={group ? "mt-10" : "mt-9"} key={group}><Bar className="h-6 w-48" /><Bar className="mt-2 h-3 w-72" /><div className="mt-5 grid gap-8 md:grid-cols-2">{[0, 1].map(item => <div key={item}><Bar className="h-3 w-28" /><div className="mt-3 flex gap-2">{[0, 1, 2].map(chip => <Bar className="h-8 w-16 rounded-full" key={chip} />)}</div></div>)}</div></div>)}
    <div className="mt-7 space-y-3"><Bar className="h-3 w-40" /><Bar className="h-4 w-2/3" /></div>
    <ProfileProofsSkeleton /><ProfilePostsSkeleton />
  </div>;
}

function DiscoverSkeleton() {
  return <><HeadingSkeleton />
    <div className="mt-8"><Bar className="h-4 w-44" /><div className="mt-2 grid gap-x-8 sm:grid-cols-2">{[0, 1, 2, 3].map(item => <PersonSkeleton compact key={item} />)}</div></div>
    <Bar className="mt-7 h-12 w-full rounded-full" />
    <div className="mt-8"><Bar className="h-4 w-16" /><Bar className="mt-2 h-3 w-12" /></div>
    <div className="mt-2 divide-y divide-line">{[0, 1, 2, 3].map(item => <PersonSkeleton key={item} />)}</div>
  </>;
}

function CollaborationSkeleton() {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0"><HeadingSkeleton /><div className="mt-6 space-y-4">{[0, 1].map(item => <div className="surface space-y-4 p-4 sm:p-6" key={item}>
      <div className="flex justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><Bar className="h-11 w-11 shrink-0 rounded-xl" /><div className="min-w-0 space-y-2"><Bar className="h-4 w-32" /><Bar className="h-3 w-40" /></div></div><Bar className="h-6 w-16 shrink-0 rounded-full" /></div>
      <Bar className="h-3 w-24" />
      <Bar className="h-6 w-2/3" /><div className="space-y-2"><Bar className="h-4 w-full" /><Bar className="h-4 w-4/5" /></div>
      <div className="flex gap-2"><Bar className="h-7 w-16 rounded-full" /><Bar className="h-7 w-20 rounded-full" /></div>
      <div className="flex flex-wrap gap-4"><Bar className="h-3 w-28" /><Bar className="h-3 w-24" /><Bar className="h-3 w-32" /></div>
      <div className="flex justify-end border-t border-line pt-4"><Bar className="h-9 w-36 rounded-lg" /></div>
    </div>)}</div></div>
    <aside className="surface self-start p-5"><Bar className="h-5 w-52" /><div className="mt-5 space-y-4"><FieldSkeleton /><FieldSkeleton multiline /><FieldSkeleton /><FieldSkeleton /><div className="grid grid-cols-2 gap-3"><FieldSkeleton /><FieldSkeleton /></div><FieldSkeleton /><FieldSkeleton /><Bar className="h-11 w-full rounded-xl" /></div></aside>
  </div>;
}

function MessagesSkeleton({ thread = false }: { thread?: boolean }) {
  return <div className="messages-viewport flex overflow-hidden">
    <aside className={`${thread ? "hidden md:block" : "block"} h-full w-full shrink-0 border-line md:w-[340px] md:border-r`}>
      <div className="flex h-17 items-center justify-between gap-2 border-b border-line px-2 sm:px-5"><div className="min-w-0 space-y-2"><Bar className="h-5 w-24" /><Bar className="h-3 w-44" /></div><Bar className="h-6 w-6 shrink-0" /></div>
      <div className="space-y-1 py-2.5 sm:px-2.5">{[0, 1, 2, 3, 4].map(item => <div className="flex gap-3 p-3" key={item}><Bar className="h-11 w-11 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><div className="flex justify-between gap-4"><Bar className="h-4 w-28" /><Bar className="h-3 w-8" /></div><Bar className="h-3 w-full" /></div></div>)}</div>
    </aside>
    {thread ? <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-17 shrink-0 items-center gap-3 border-b border-line px-5"><Bar className="h-10 w-10 rounded-full" /><div className="space-y-2"><Bar className="h-4 w-36" /><Bar className="h-3 w-24" /></div></div>
      <div className="flex flex-1 flex-col justify-end gap-5 overflow-hidden p-5"><Bar className="h-12 w-3/5 rounded-2xl" /><Bar className="h-16 w-1/2 self-end rounded-2xl" /><Bar className="h-12 w-2/5 rounded-2xl" /></div>
      <div className="flex shrink-0 gap-2 border-t border-line px-1 py-3 sm:p-4"><Bar className="h-11 flex-1 rounded-full" /><Bar className="h-11 w-11 shrink-0 rounded-full" /></div>
    </div> : <div className="hidden min-w-0 flex-1 place-items-center px-8 md:grid"><div className="w-full max-w-sm"><Bar className="mx-auto h-16 w-16 rounded-2xl" /><Bar className="mx-auto mt-5 h-6 w-36" /><Bar className="mt-3 h-4 w-full" /><Bar className="mx-auto mt-2 h-4 w-2/3" /><Bar className="mx-auto mt-5 h-11 w-40 rounded-xl" /></div></div>}
  </div>;
}

function PostComposerSkeleton() {
  return <div className="mx-auto max-w-2xl"><HeadingSkeleton /><div className="surface mt-6 overflow-hidden">
    <div className="flex gap-3 p-4 sm:p-5"><Bar className="h-11 w-11 shrink-0 rounded-xl" /><div className="min-h-32 flex-1 pt-2"><Bar className="h-4 w-3/4" /></div></div>
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex justify-between gap-4"><Bar className="h-4 w-14" /><Bar className="h-4 w-14" /><Bar className="h-4 w-20" /></div><Bar className="h-9 w-full rounded-xl sm:w-20" /></div>
    <Bar className="mx-5 mt-1 mb-5 h-3 w-48" />
  </div></div>;
}

function EditProfileSkeleton() {
  return <div className="mx-auto max-w-4xl py-6 sm:py-8"><HeadingSkeleton /><div className="mt-7 space-y-7 border-t border-line pt-7">
    <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map(item => <FieldSkeleton key={item} />)}{[0, 1, 2].map(item => <div className="sm:col-span-2" key={`wide-${item}`}><FieldSkeleton /></div>)}</div>
    <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map(item => <FieldSkeleton key={item} />)}<div className="sm:col-span-2"><FieldSkeleton multiline /></div></div>
    <div className="grid gap-5 sm:grid-cols-3">{[0, 1, 2].map(item => <FieldSkeleton key={item} />)}</div><Bar className="h-11 w-36 rounded-xl" />
  </div></div>;
}

function NotificationsSkeleton() {
  return <div className="mx-auto max-w-3xl"><HeadingSkeleton /><div className="mt-7 flex justify-between"><Bar className="h-3 w-28" /><Bar className="h-3 w-16" /></div><div className="mt-3 divide-y divide-line">{[0, 1, 2, 3, 4].map(item => <div className="flex gap-4 py-5" key={item}><Bar className="h-10 w-10 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Bar className="h-4 w-full" /><Bar className="h-4 w-2/3" /><Bar className="h-3 w-16" /></div></div>)}</div></div>;
}

function ConnectionsSkeleton() {
  return <><HeadingSkeleton /><div className="mt-7 flex gap-6 border-b border-line pb-3"><Bar className="h-5 w-28" /><Bar className="h-5 w-28" /></div><div className="divide-y divide-line pt-4">{[0, 1, 2, 3].map(item => <PersonSkeleton key={item} />)}</div></>;
}

function ReportSkeleton() {
  return <div className="mx-auto max-w-2xl"><HeadingSkeleton /><div className="mt-7 space-y-5"><FieldSkeleton /><FieldSkeleton /><FieldSkeleton multiline /><Bar className="h-3 w-3/4" /><Bar className="h-11 w-36 rounded-xl" /></div></div>;
}

const layouts = {
  feed: FeedSkeleton,
  profile: ProfileSkeleton,
  discover: DiscoverSkeleton,
  collaborate: CollaborationSkeleton,
  messages: MessagesSkeleton,
  thread: () => <MessagesSkeleton thread />,
  post: PostComposerSkeleton,
  "edit-profile": EditProfileSkeleton,
  notifications: NotificationsSkeleton,
  connections: ConnectionsSkeleton,
  report: ReportSkeleton,
  generic: HeadingSkeleton,
};

export default function PageSkeleton({ kind }: { kind: PageSkeletonKind }) {
  const Layout = layouts[kind];
  return <div className="app-page" data-page-skeleton={kind}><SkeletonRegion label="Loading page"><Layout /></SkeletonRegion></div>;
}
