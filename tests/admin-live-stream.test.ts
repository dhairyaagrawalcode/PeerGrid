import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createAdminLiveStream } from "../app/lib/admin-live-stream.ts";
const initial = { revision: "1", checked_at: "2026-09-02T12:00:00Z", time_bucket: "42" };
const decoder = new TextDecoder();
const text = async (reader: ReadableStreamDefaultReader<Uint8Array>) => decoder.decode((await reader.read()).value);

test("server live events re-read the database and cancel subscriptions cleanly", async () => {
  let change = () => {}, stopped = 0, reads = 0;
  const stream = createAdminLiveStream({ signal: new AbortController().signal, initial, debounceMs: 1,
    read: async () => { reads++; return { data: { ...initial, revision: "2" } }; },
    subscribe: (onChange, onStatus) => { change = onChange; onStatus(true); return () => { stopped++; }; }
  });
  const reader = stream.getReader();
  await text(reader); assert.match(await text(reader), /"revision":"1"/);
  assert.match(await text(reader), /"revision":"2".*"realtime":true/);
  change(); change(); change();
  assert.match(await text(reader), /event: version/);
  assert.equal(reads,2);
  await reader.cancel(); change(); await delay(10);
  assert.equal(stopped,1); assert.equal(reads,2);
});

test("fallback reconciles when WebSockets fail; expiration emits no further data", async () => {
  let reads=0;
  const stream = createAdminLiveStream({ signal: new AbortController().signal, initial, heartbeatMs: 5,
    read: async () => ++reads === 1 ? { data: { ...initial, revision: "3" } } : { error: "expired" },
    subscribe: () => { throw new Error("socket unavailable"); }
  });
  const reader=stream.getReader(); await text(reader); await text(reader);
  assert.match(await text(reader), /"revision":"3".*"realtime":false/);
  assert.match(await text(reader), /event: expired/);
  assert.equal((await reader.read()).done,true);
  await delay(10); assert.equal(reads,2);
});

test("abort cancels in-flight reads and lifetime releases the server connection", async () => {
  const abort=new AbortController(); let stopped=0, readSignal: AbortSignal | undefined;
  const stream=createAdminLiveStream({ signal: abort.signal, initial, debounceMs: 1,
    read: async (signal) => { readSignal=signal; await new Promise<void>(resolve => signal.addEventListener("abort",()=>resolve(),{once:true})); return { data: initial }; },
    subscribe: (_change,status) => { status(true); return () => { stopped++; }; }
  });
  const reader=stream.getReader(); await text(reader); await text(reader); await delay(10);
  abort.abort(); assert.equal(readSignal?.aborted,true); assert.equal(stopped,1); assert.equal((await reader.read()).done,true);
  let lifetimeStopped=0;
  const limited=createAdminLiveStream({ signal: new AbortController().signal, initial, lifetimeMs: 5,
    read: async () => ({data:initial}), subscribe: () => () => { lifetimeStopped++; }
  }).getReader();
  await text(limited); await text(limited); assert.equal((await limited.read()).done,true); assert.equal(lifetimeStopped,1);
});
