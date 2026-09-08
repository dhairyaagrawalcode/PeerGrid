import { SkeletonBar as Bar, SkeletonRegion } from "./section-skeleton";

export default function AdminPageSkeleton() {
  return <SkeletonRegion label="Loading admin data">
    <div data-page-skeleton="admin"><Bar className="h-8 w-44" /><Bar className="mt-3 h-4 w-[min(100%,34rem)]" />
      <div className="mt-7 grid gap-4 xl:grid-cols-3">{[0, 1, 2].map((group) => <div className="rounded-2xl border border-line p-5" key={group}><Bar className="h-4 w-24" /><div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div className="space-y-2" key={item}><Bar className="h-3 w-full" /><Bar className="h-7 w-12" /></div>)}</div></div>)}</div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">{[0, 1].map((item) => <Bar className="h-24 w-full rounded-2xl" key={item} />)}</div>
      <div className="mt-10 grid gap-8 md:grid-cols-2">{[0, 1].map((item) => <div className="space-y-4" key={item}><Bar className="h-5 w-40" /><Bar className="h-48 w-full rounded-xl" /></div>)}</div>
    </div>
  </SkeletonRegion>;
}
