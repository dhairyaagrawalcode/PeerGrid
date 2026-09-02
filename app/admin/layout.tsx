import type { ReactNode } from "react";
export const dynamic = "force-dynamic";
export const metadata = { title: "PeerGrid Admin", robots: { index: false, follow: false } };
export default function AdminRootLayout({ children }: { children: ReactNode }) { return children; }
