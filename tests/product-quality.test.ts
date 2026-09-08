import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing page exposes the real PeerGrid GitHub repository", () => {
  const landing = source("app/page.tsx");
  assert.match(landing, /https:\/\/github\.com\/dhairyaagrawalcode\/PeerGrid/);
  assert.match(landing, /FiGithub/);
});

test("post media and previews remain bounded without forced cropping", () => {
  for (const file of ["app/components/post-image.tsx", "app/components/social-post-card.tsx", "app/components/post-composer.tsx"]) {
    const component = source(file);
    assert.match(component, /object-contain/);
    assert.doesNotMatch(component, /object-cover/);
  }
  assert.doesNotMatch(source("app/components/social-post-card.tsx"), /min-h-40/);
});

test("only message senders receive message deletion permission", () => {
  const migration = source("supabase/migrations/20260908000000_message_deletion.sql");
  const thread = source("app/components/message-thread.tsx");
  assert.match(migration, /for delete to authenticated/);
  assert.match(migration, /sender_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /is_conversation_member\(conversation_id\)/);
  assert.match(migration, /sync_conversation_after_message_delete/);
  assert.match(thread, /Delete message and attachment/);
  assert.match(thread, /storage\.from\("message-media"\)\.remove/);
});

test("post owners have a confirmed post and media deletion flow", () => {
  const action = source("app/actions/posts.ts");
  const button = source("app/components/post-delete-button.tsx");
  assert.match(action, /\.eq\("author_id", user\.id\)/);
  assert.match(action, /storage\.from\("post-media"\)\.remove/);
  assert.match(button, /ConfirmationModal/);
});

test("message attachments use a private opaque bucket and conversation membership policies", () => {
  const migration = source("supabase/migrations/20260905000000_product_quality_pass.sql");
  assert.match(migration, /values \('message-media', 'message-media', false/);
  assert.match(migration, /allowed_mime_types = excluded\.allowed_mime_types/);
  assert.match(migration, /conversation_members/);
  assert.match(migration, /message\.attachment_path = name/);
  assert.doesNotMatch(migration, /attachment_key|decryption_key|original_filename|original_mime/);
});

test("admin user filters execute in the database with bounded pagination", () => {
  const migration = source("supabase/migrations/20260905000000_product_quality_pass.sql");
  const page = source("app/admin/(dashboard)/users/page.tsx");
  assert.match(migration, /limit 31 offset least\(greatest\(result_offset,0\),30000\)/);
  assert.match(migration, /campus_filter uuid/);
  assert.match(migration, /active_from date/);
  assert.match(page, /admin_user_filter_options/);
  assert.match(page, /Promise\.all/);
  assert.doesNotMatch(migration, /create index[\s\S]*?on auth\.users/i);
});

test("smooth scrolling is declared to Next.js route transitions", () => {
  const layout = source("app/layout.tsx");
  assert.match(layout, /data-scroll-behavior="smooth"/);
});

test("stale Supabase sessions fail closed without logging token errors", () => {
  const proxy = source("app/lib/supabase/proxy.ts");
  assert.match(proxy, /try \{[\s\S]*supabase\.auth\.getClaims\(\)[\s\S]*\} catch/);
  assert.match(proxy, /clearStaleAuthCookies/);
  assert.doesNotMatch(proxy, /console\.(?:error|log|warn)/);
});
