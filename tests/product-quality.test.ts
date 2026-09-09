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
  const menu = source("app/components/post-action-menu.tsx");
  assert.match(action, /\.eq\("author_id", user\.id\)/);
  assert.match(action, /storage\.from\("post-media"\)\.remove/);
  assert.match(menu, /ConfirmationModal/);
  assert.match(menu, /Edit post/);
  assert.match(menu, /Delete post/);
  assert.match(menu, /Interested/);
  assert.match(menu, /Not interested/);
  assert.match(menu, /Report post/);
});

test("saved posts are private, persistent, and reachable from desktop and mobile account menus", () => {
  const migration = source("supabase/migrations/20260909010000_saved_posts.sql");
  const action = source("app/actions/post-engagement.ts");
  const engagement = source("app/components/post-engagement.tsx");
  const desktopMenu = source("app/components/app-shell.tsx");
  const mobileMenu = source("app/components/mobile-page-header.tsx");
  const savedPage = source("app/(platform)/saved/page.tsx");
  const styles = source("app/globals.css");

  assert.match(migration, /primary key \(user_id, post_id\)/);
  assert.match(migration, /alter table public\.saved_posts enable row level security/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(action, /toggleSavedPost/);
  assert.match(action, /\.eq\("user_id", user\.id\)/);
  assert.match(action, /revalidatePath\("\/saved"\)/);
  assert.match(engagement, /FiBookmark/);
  assert.match(engagement, /aria-pressed=\{saved\}/);
  assert.match(desktopMenu, /href="\/saved"[\s\S]*Saved posts/);
  assert.match(mobileMenu, /href="\/saved"[\s\S]*Saved posts/);
  assert.match(savedPage, /getSavedSocialPosts/);
  assert.match(savedPage, /saved-posts-page/);
  assert.match(styles, /\.app-page\.saved-posts-page\s*{[\s\S]*?max-width:\s*38\.75rem/);
});

test("persisted post preferences affect both the selected post and related author ranking", () => {
  const action = source("app/actions/recommendations.ts");
  const migration = source("supabase/migrations/20260909000000_plaintext_messages_and_post_actions.sql");
  assert.match(action, /record_recommendation_event/);
  assert.match(action, /interested.*not_interested/);
  assert.match(migration, /event\.user_id = auth\.uid\(\)/);
  assert.match(migration, /author_negative_signals/);
  assert.match(migration, /signaled_post\.author_id = post\.author_id/);
});

test("message attachments use a private opaque bucket and conversation membership policies", () => {
  const migration = source("supabase/migrations/20260905000000_product_quality_pass.sql");
  assert.match(migration, /values \('message-media', 'message-media', false/);
  assert.match(migration, /allowed_mime_types = excluded\.allowed_mime_types/);
  assert.match(migration, /conversation_members/);
  assert.match(migration, /message\.attachment_path = name/);
  assert.doesNotMatch(migration, /attachment_key|decryption_key|original_filename|original_mime/);
});

test("new messages use participant-protected plaintext while legacy encrypted rows remain recognizable", () => {
  const migration = source("supabase/migrations/20260909000000_plaintext_messages_and_post_actions.sql");
  const thread = source("app/components/message-thread.tsx");
  assert.match(migration, /add column if not exists body text/);
  assert.match(migration, /viewer_member\.profile_id = auth\.uid\(\)/);
  assert.match(migration, /revoke execute on function public\.register_crypto_device/);
  assert.match(thread, /body: plaintext \|\| null/);
  assert.match(thread, /Legacy encrypted message/);
  assert.doesNotMatch(thread, /libsodium|key_envelopes|sender_device_id/);
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
