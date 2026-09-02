import type { AdminDataVersion } from "./admin-live.ts";

type ReadResult = { data?: AdminDataVersion; error?: "expired" | "unavailable" };
type StreamOptions = {
  signal: AbortSignal;
  initial: AdminDataVersion;
  read: (signal: AbortSignal) => Promise<ReadResult>;
  subscribe: (onChange: () => void, onStatus: (live: boolean) => void) => () => void;
  heartbeatMs?: number;
  lifetimeMs?: number;
  debounceMs?: number;
};

// Transport-independent so cleanup, reconnection and authorization can be regression-tested.
export function createAdminLiveStream({ signal, initial, read, subscribe, heartbeatMs = 5000, lifetimeMs = 55000, debounceMs = 200 }: StreamOptions) {
  let cleanup: (closeController?: boolean) => void = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false, checking = false, realtime = false;
      let unsubscribe = () => {};
      let debounce: ReturnType<typeof setTimeout> | undefined;
      const pendingRequest = new AbortController();
      function emit(event: string, data: unknown) {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }
      const onAbort = () => cleanup();
      cleanup = (closeController = true) => {
        if (closed) return;
        closed = true;
        clearTimeout(debounce); clearInterval(heartbeat); clearTimeout(lifetime);
        pendingRequest.abort();
        signal.removeEventListener("abort", onAbort);
        unsubscribe();
        if (closeController) controller.close();
      };
      async function check() {
        if (closed || checking) return;
        checking = true;
        try {
          // read() must validate authorization before returning any version.
          const result = await read(pendingRequest.signal);
          if (closed) return;
          if (result.error || !result.data) {
            emit(result.error || "unavailable", {}); cleanup(); return;
          }
          emit("version", { ...result.data, realtime });
        } catch {
          if (!closed) { emit("unavailable", {}); cleanup(); }
        } finally { checking = false; }
      }
      function scheduleCheck() {
        // Bound update frequency without starving refresh during sustained writes.
        if (closed || debounce !== undefined) return;
        debounce = setTimeout(() => { debounce = undefined; void check(); }, debounceMs);
      }
      const heartbeat = setInterval(() => { void check(); }, heartbeatMs);
      const lifetime = setTimeout(cleanup, lifetimeMs);
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) { cleanup(); return; }
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      emit("version", { ...initial, realtime: false });
      try {
        unsubscribe = subscribe(scheduleCheck, (live) => { realtime = live; scheduleCheck(); });
      } catch {
        // Reconciliation remains available if WebSockets cannot connect.
        realtime = false;
      }
    },
    cancel() { cleanup(false); },
  });
}
