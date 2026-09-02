import { getPasswordAdminSession } from "@/app/lib/admin-password";
import type { AdminDataVersion } from "@/app/lib/admin-live";
import { createAdminLiveStream } from "@/app/lib/admin-live-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const noCache = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" };

export async function GET(request: Request) {
  // Route handlers do not inherit layout authorization.
  if (request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403, headers: noCache });
  const session = await getPasswordAdminSession();
  if (!session) return new Response(null, { status: 401, headers: noCache });
  const { supabase } = session;
  const initial = await supabase.rpc("admin_data_version");
  if (initial.error) return new Response(null, { status: 503, headers: noCache });
  if (new URL(request.url).searchParams.has("check")) return Response.json({ ok: true }, { headers: noCache });

  const stream = createAdminLiveStream({
    signal: request.signal,
    initial: initial.data as AdminDataVersion,
    read: async (signal) => {
      // The RPC checks the session again, including revocation and expiration.
      const { data, error } = await supabase.rpc("admin_data_version").abortSignal(signal);
      if (error) return { error: error.code === "42501" ? "expired" : "unavailable" };
      return { data: data as AdminDataVersion };
    },
    subscribe: (onChange, onStatus) => {
      // Only a private revision row, never Auth or message payloads.
      const channel = supabase.channel(`admin-live-${crypto.randomUUID()}`);
      const stop = () => { void supabase.removeChannel(channel).catch(() => {}).finally(() => supabase.realtime.disconnect()); };
      try {
        channel.on("postgres_changes", { event: "UPDATE", schema: "peergrid_private", table: "admin_data_revision" }, onChange)
          .subscribe((status) => onStatus(status === "SUBSCRIBED"));
      } catch {
        stop(); onStatus(false);
      }
      return stop;
    },
  });
  return new Response(stream, { headers: { ...noCache, "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } });
}
