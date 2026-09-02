"use client";
import { useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { accessDestination } from "@/app/lib/platform-access";
export default function ActivityTracker() {
  useEffect(() => {
    const supabase = createClient();
    let stopped = false, checking = false, lastWrite = 0, lastInteraction = Date.now();
    const interact = () => { lastInteraction = Date.now(); };
    async function check() {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const { data, error } = await supabase.rpc("get_platform_access");
        if (stopped) return;
        // On transient network errors keep the page, but RLS still denies unauthorized requests.
        if (error) return;
        const destination = accessDestination(data, true);
        if (destination) { window.location.replace(destination); return; }
        const now = Date.now();
        if (now - lastInteraction < 5 * 60_000 && now - lastWrite >= 5 * 60_000) {
          lastWrite = now;
          await supabase.rpc("record_user_activity");
        }
      } finally { checking = false; }
    }
    const visible = () => { if (document.visibilityState === "visible") { interact(); void check(); } };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.replace("/");
    });
    document.addEventListener("pointerdown", interact, { passive: true });
    document.addEventListener("keydown", interact);
    document.addEventListener("scroll", interact, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visible);
    void check();
    const timer = window.setInterval(() => { void check(); }, 60_000);
    return () => {
      stopped = true; window.clearInterval(timer); subscription.unsubscribe();
      document.removeEventListener("pointerdown", interact); document.removeEventListener("keydown", interact);
      document.removeEventListener("scroll", interact, true); document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return null;
}
