"use client";

import { useEffect } from "react";
import { FiAlertCircle } from "react-icons/fi";

export default function PlatformError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <section className="app-page surface flex flex-col items-center px-6 py-14 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger"><FiAlertCircle size={22} /></div><h1 className="mt-4 text-lg font-bold">PeerGrid could not load this page</h1><p className="mt-2 max-w-sm text-sm leading-6 text-muted">Check your connection and try again. If this keeps happening, confirm the Supabase migration and environment setup.</p><button className="button button-primary mt-6" onClick={reset}>Try again</button></section>;
}
