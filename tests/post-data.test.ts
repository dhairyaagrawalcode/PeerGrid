import test from "node:test";
import assert from "node:assert/strict";
import { getSocialPosts, POST_PAGE_SIZE } from "../app/lib/data.ts";

type Client = Parameters<typeof getSocialPosts>[0];
function query(rows: unknown[]) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder = {
    select(...args: unknown[]) { calls.push(["select", ...args]); return builder; },
    eq(...args: unknown[]) { calls.push(["eq", ...args]); return builder; },
    in(...args: unknown[]) { calls.push(["in", ...args]); return builder; },
    order(...args: unknown[]) { calls.push(["order", ...args]); return builder; },
    range(...args: unknown[]) { calls.push(["range", ...args]); return builder; },
    then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
  };
  return { builder, calls };
}

test("post pages are bounded and engagement/storage run concurrently in batches", async () => {
  assert.equal(POST_PAGE_SIZE, 12);
  const { builder, calls } = query([{ id: "one", attachment_path: "shared" }, { id: "two", attachment_path: "shared" }]);
  let finish!: (value: unknown) => void;
  let storageCalls = 0;
  let engagementCalls = 0;
  const client = {
    from: () => builder,
    rpc(name: string, args: { candidate_post_ids: string[] }) {
      assert.equal(name, "get_post_engagement");
      assert.deepEqual(args.candidate_post_ids, ["one", "two"]);
      engagementCalls++;
      return new Promise(resolve => { finish = resolve; });
    },
    storage: { from: () => ({ createSignedUrls: async (paths: string[]) => {
      storageCalls++;
      assert.deepEqual(paths, ["shared"]);
      return { data: [{ path: "shared", signedUrl: "signed-test-image" }], error: null };
    } }) },
  } as unknown as Client;
  const pending = getSocialPosts(client);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(storageCalls, 1, "storage must start without waiting for engagement");
  finish({ data: [{ post_id: "one", like_count: "3", comment_count: "2", viewer_liked: true }], error: null });
  const posts = await pending;
  assert.equal(engagementCalls, 1);
  assert.equal(posts[0].like_count, 3);
  assert.equal(posts[0].viewer_liked, true);
  assert.equal(posts[1].attachment_url, "signed-test-image");
  assert.deepEqual(calls.find(([name]) => name === "range"), ["range", 0, 11]);
});

test("an empty post page does not perform engagement or media queries", async () => {
  const { builder } = query([]);
  const client = { from: () => builder, rpc: () => assert.fail("unnecessary RPC"), storage: { from: () => assert.fail("unnecessary storage call") } } as unknown as Client;
  assert.deepEqual(await getSocialPosts(client), []);
});

test("ranked results retain database order and their explanation", async () => {
  const { builder } = query([{ id: "one" }, { id: "two" }]);
  const client = { from: () => builder, rpc: async (name: string) => ({
    data: name === "get_ranked_feed" ? [{ post_id: "two", recommendation_reason: "Followed" }, { post_id: "one", recommendation_reason: "Recent" }] : [], error: null,
  }) } as unknown as Client;
  const result = await getSocialPosts(client, { ranked: true });
  assert.deepEqual(result.map(p => p.id), ["two", "one"]);
  assert.equal(result[0].recommendation_reason, "Followed");
});
