import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("loaded and loading shells reserve the same mobile navigation space", () => {
  for (const name of ["app-shell", "platform-shell-skeleton"]) {
    const shell = source(`app/components/${name}.tsx`);
    assert.match(shell, /className="app-frame app-main"/);
    assert.match(shell, /className="mobile-navigation /);
    assert.match(shell, /mobile-navigation[^\n]*grid-cols-5/);
    assert.doesNotMatch(shell, /pb-24|h-\[4\.4rem\]/);
  }
  const css = source("app/globals.css");
  assert.match(css, /--pg-mobile-nav-height: calc\(4\.4rem \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /padding-bottom: var\(--pg-content-bottom\)/);
  assert.match(css, /--pg-content-bottom: calc\(var\(--pg-mobile-nav-height\) \+ 1rem\)/);
});

test("chat and chat skeleton use the same available viewport without a fixed minimum", () => {
  for (const name of ["messages-view", "page-skeleton"]) {
    const component = source(`app/components/${name}.tsx`);
    assert.match(component, /messages-viewport/);
    assert.doesNotMatch(component, /min-h-\[520px\]|100dvh-/);
  }
  const css = source("app/globals.css");
  assert.match(css, /\.messages-viewport\s*\{\s*height: calc\(100dvh - var\(--pg-content-top\) - var\(--pg-content-bottom\)\);\s*min-height: 0;/);
  const inbox = source("app/components/conversation-list.tsx");
  assert.match(inbox, /w-full min-w-0 flex-col border-line md:w-\[340px\] md:flex-none md:border-r/);
  assert.match(source("app/components/message-thread.tsx"), /shrink-0 border-t border-line/);
});

test("an open mobile conversation replaces the application bars", () => {
  const shell = source("app/components/app-shell.tsx");
  const css = source("app/globals.css");
  assert.match(shell, /mobileConversationOpen/);
  assert.match(shell, /mobile-chat-open/);
  assert.match(css, /\.mobile-chat-open > header[\s\S]*\.mobile-chat-open > \.mobile-navigation[\s\S]*display: none/);
  assert.match(css, /\.mobile-chat-open \.messages-viewport\s*\{\s*height: 100dvh/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("mobile feature header links to full-page notifications and profile settings", () => {
  const shell = source("app/components/app-shell.tsx");
  const header = source("app/components/mobile-page-header.tsx");
  assert.match(shell, /MobilePageHeader/);
  assert.match(header, /href="\/notifications"/);
  assert.match(header, /aria-label="Settings"/);
  assert.match(header, /showModal\(\)/);
  assert.match(header, /href="\/messages"/);
  assert.match(shell, /mobileNavigation\.map/);
  assert.doesNotMatch(shell.match(/const mobileNavigation =[\s\S]*?\];/)?.[0] ?? "", /Messages|Notifications/);
  assert.match(shell, /aria-label="Mobile navigation"/);
});

test("compact navigation, feed engagement, search filters, and profile settings stay intentional", () => {
  const header = source("app/components/mobile-page-header.tsx");
  const settings = header.match(/<nav aria-label="Account settings"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const engagement = source("app/components/post-engagement.tsx");
  const search = source("app/components/discover-search.tsx");
  const profile = source("app/components/profile-view.tsx");
  const css = source("app/globals.css");

  assert.match(header, /path === "\/feed"[\s\S]*href="\/messages"[\s\S]*href="\/notifications"/);
  assert.doesNotMatch(settings, /View profile|Messages/);
  assert.doesNotMatch(css, /a\[href="\/post"\]/);
  assert.doesNotMatch(engagement, /\{likeCount\} \{likeCount ===/);
  assert.doesNotMatch(engagement, /\{commentCount\} \{commentCount ===/);
  assert.match(search, /Filters from student profiles/);
  assert.match(search, /student\.skills/);
  assert.match(search, /student\.interests/);
  assert.match(search, /inputMode="search"/);
  assert.doesNotMatch(search, /type="search"/);
  assert.match(profile, /profile-edit-button/);
  assert.match(css, /data-mobile-route="\/profile"\] \.profile-edit-button \{ display: none !important; \}/);
  assert.match(css, /\.feed-post-list > \.social-post:last-child \{ border-bottom: 0; \}/);
  assert.match(css, /article\[id\^="collaboration-"\] \+ article\[id\^="collaboration-"\]/);
});

test("mobile feed details, conversation search, and profile editing remain compact", () => {
  const feed = source("app/(platform)/feed/page.tsx");
  const inbox = source("app/components/conversation-list.tsx");
  const engagement = source("app/components/post-engagement.tsx");
  const editProfile = source("app/(platform)/profile/edit/page.tsx");
  const css = source("app/globals.css");

  assert.match(inbox, /Search conversations by name, username, or ID/);
  assert.match(inbox, /conversation\.conversation_id/);
  assert.match(inbox, /filteredConversations/);
  assert.match(feed, /feed-composer-prompt/);
  assert.doesNotMatch(feed, /feed-composer[^\n]*!rounded/);
  assert.match(engagement, /post-engagement-actions/);
  assert.match(engagement, /post-comments-list/);
  assert.match(editProfile, /edit-profile-section/);
  assert.match(editProfile, /edit-profile-form/);
  assert.match(css, /data-mobile-route="\/feed"\] \.feed-composer \{ inline-size: calc\(100% \+ 2rem\)/);
  assert.match(css, /feed-composer[^{]*\{[^}]*border-radius: 0 !important/);
  assert.match(css, /\.social-post \.post-media \{ inline-size: calc\(100% - 3\.25rem\)/);
  assert.match(css, /\.feed-post-list > \.social-post \.post-avatar \{ inset-inline-start: 1rem; \}/);
  assert.match(css, /data-mobile-route="\/profile\/edit"\] \.edit-profile-form \{ margin-top: 0; padding-top: \.5rem; border-top: 0; \}/);
});

test("mobile route motion is directional and respects reduced motion", () => {
  const shell = source("app/components/app-shell.tsx");
  const header = source("app/components/mobile-page-header.tsx");
  const css = source("app/globals.css");

  assert.match(shell, /ViewTransition/);
  assert.match(shell, /MobilePageHeader key=\{`mobile-header:\$\{pathname\}`\}/);
  assert.match(shell, /key=\{`route-content:\$\{pathname\}`\}/);
  assert.match(shell, /"nav-forward": "pg-nav-forward"/);
  assert.match(shell, /"nav-back": "pg-nav-back"/);
  assert.match(header, /href="\/notifications" transitionTypes=\{\["nav-forward"\]\}/);
  assert.match(header, /transitionTypes=\{\["nav-back"\]\}/);
  assert.match(css, /::view-transition-new\(\.pg-nav-forward\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("profile async sections keep unique sibling identities", () => {
  const ownProfile = source("app/(platform)/profile/page.tsx");
  const studentProfile = source("app/(platform)/students/[username]/page.tsx");

  assert.match(ownProfile, /key=\{`profile-proofs:\$\{proofPage\}`\}/);
  assert.match(ownProfile, /key=\{`profile-posts:\$\{page\}`\}/);
  assert.match(studentProfile, /key=\{`student-proofs:\$\{proofPage\}`\}/);
  assert.match(studentProfile, /key=\{`student-posts:\$\{page\}`\}/);
  assert.doesNotMatch(ownProfile, /<Suspense key=\{(?:page|proofPage)\}/);
  assert.doesNotMatch(studentProfile, /<Suspense key=\{(?:page|proofPage)\}/);
});

test("mobile navigation follows the requested five-item order", () => {
  const shell = source("app/components/app-shell.tsx");
  const mobile = shell.match(/const mobileNavigation =[\s\S]*?\];/)?.[0] ?? "";
  const paths = [...mobile.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(paths, ["/feed", "/discover", "/post", "/collaborate", "/profile"]);
});

test("narrow people rows and admin filters stack instead of squeezing content", () => {
  assert.match(source("app/components/student-result.tsx"), /grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(source("app/components/student-result.tsx"), /col-start-2 justify-self-start/);
  const adminUsers = source("app/admin/(dashboard)/users/page.tsx");
  assert.match(adminUsers, /grid gap-2 sm:grid-cols-\[minmax\(0,1fr\)_180px_auto\]/);
  assert.match(adminUsers, /mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3/);
  assert.doesNotMatch(source("app/components/issue-report-form.tsx"), /break-all/);
});
