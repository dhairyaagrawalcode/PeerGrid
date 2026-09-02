"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <section role="alert"><h1 className="text-xl font-bold">Admin data is unavailable</h1><p className="mt-2 text-sm text-muted">Verify that the admin migrations and server credentials have been configured, then retry.</p><button className="button button-secondary mt-5" onClick={reset}>Try again</button></section>;
}
