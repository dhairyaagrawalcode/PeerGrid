"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isAdminLiveUpdate, needsAdminRefresh, type AdminDataVersion } from "@/app/lib/admin-live";

export default function AdminLiveRefresh({ databaseHost }: { databaseHost: string }) {
  const router = useRouter(), pathname = usePathname(), search = useSearchParams().toString();
  const [state, setState] = useState("Connecting…");
  const [checkedAt, setCheckedAt] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let stream: EventSource | undefined, stopped = false;
    let previous: AdminDataVersion | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let authCheck: AbortController | undefined;
    function disconnect() { stream?.close(); stream = undefined; clearTimeout(watchdog); authCheck?.abort(); }
    function connect() {
      disconnect();
      if (stopped || document.hidden || !navigator.onLine) { setState(navigator.onLine ? "Updates paused" : "Offline — data may be stale"); return; }
      setState("Connecting…");
      // Always reconcile after reconnect: never use a missed event as a source of truth.
      previous = null;
      stream = new EventSource("/admin/live");
      watchdog = setTimeout(connect, 15000);
      stream.addEventListener("version", (event) => {
        let data: unknown;
        try { data = JSON.parse((event as MessageEvent).data); } catch { return; }
        if (!isAdminLiveUpdate(data)) return;
        setCheckedAt(new Date(data.checked_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setState(data.realtime ? "Live updates" : "Auto-refresh · 5s");
        clearTimeout(watchdog);
        watchdog = setTimeout(() => { setState("Connection delayed — retrying…"); connect(); }, 15000);
        if (needsAdminRefresh(previous, data) && refreshTimer === undefined) {
          refreshTimer = setTimeout(() => { refreshTimer = undefined; startTransition(() => router.refresh()); }, 500);
        }
        previous = data;
      });
      stream.addEventListener("expired", () => { disconnect(); router.replace("/admin/login"); router.refresh(); });
      stream.addEventListener("unavailable", () => setState("Database unavailable — retrying…"));
      stream.onerror = () => {
        setState("Disconnected — retrying…");
        // Native EventSource retries ordinary disconnects; this also recovers HTTP failures.
        clearTimeout(watchdog);
        watchdog = setTimeout(connect, 10000);
        authCheck?.abort(); authCheck = new AbortController();
        void fetch("/admin/live?check=1", { cache: "no-store", credentials: "same-origin", signal: authCheck.signal })
          .then((response) => { if (!stopped && response.status === 401) { disconnect(); router.replace("/admin/login"); router.refresh(); } })
          .catch(() => {});
      };
    }
    const onFocus = () => { if (!stream) connect(); };
    connect();
    document.addEventListener("visibilitychange", connect);
    window.addEventListener("online", connect);
    window.addEventListener("offline", connect);
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true; disconnect(); clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", connect);
      window.removeEventListener("online", connect);
      window.removeEventListener("offline", connect);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, pathname, search]);
  return <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
    <span title="Compare this host with the project open in Supabase">Database: {databaseHost}</span>
    <span role="status">{pending ? "Updating…" : state}{checkedAt && ` · checked ${checkedAt} IST`}</span>
    <button type="button" className="ml-auto text-subtle hover:text-font focus-visible:outline-2 focus-visible:outline-primary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>Refresh now</button>
  </div>;
}
