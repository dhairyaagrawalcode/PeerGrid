"use client";

import { usePathname } from "next/navigation";
import PageSkeleton from "@/app/components/page-skeleton";
import { getLoadingLayout } from "@/app/lib/loading-layout";

export default function PlatformLoading() {
  return <PageSkeleton kind={getLoadingLayout(usePathname())} />;
}
