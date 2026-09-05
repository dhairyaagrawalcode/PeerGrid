import PlatformLoading from "@/app/(platform)/loading";
import Brand from "./brand";
import { SkeletonBar } from "./section-skeleton";

// No private data is rendered before ProtectedShell finishes its auth check.
// Match AppShell's viewport, header and content offsets to avoid a layout jump.
export default function PlatformShellSkeleton() {
  return <div className="h-dvh overflow-hidden bg-bg text-font">
    <header className="fixed inset-x-0 top-0 z-40 h-[4.5rem] border-b border-line bg-bg">
      <div className="app-frame flex h-full items-center gap-6">
        <Brand href="/feed" />
        <div aria-hidden="true" className="ml-auto hidden items-center gap-1 motion-safe:animate-pulse md:flex">{[0, 1, 2, 3, 4, 5].map(item => <div className="grid h-10 w-10 place-items-center" key={item}><SkeletonBar className="h-5 w-5" /></div>)}</div>
        <div aria-hidden="true" className="hidden h-7 w-px bg-line md:block" />
        <SkeletonBar className="ml-auto h-9 w-9 shrink-0 rounded-full md:ml-0" />
      </div>
    </header>
    <main className="app-frame app-main"><PlatformLoading /></main>
    <div aria-hidden="true" className="mobile-navigation fixed inset-x-0 bottom-0 grid grid-cols-6 place-items-center border-t border-line bg-bg px-1 motion-safe:animate-pulse md:hidden">{[0, 1, 2, 3, 4, 5].map(item => <SkeletonBar className="h-5 w-5" key={item} />)}</div>
  </div>;
}
