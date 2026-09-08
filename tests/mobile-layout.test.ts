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

test("mobile notifications sit beside the bounded account menu instead of in bottom navigation", () => {
  const shell = source("app/components/app-shell.tsx");
  assert.match(shell, /mobile-header-actions ml-auto flex items-center gap-2 md:ml-0/);
  assert.match(shell, /md:hidden[\s\S]*NotificationDropdown/);
  assert.match(shell, /mobileNavigation\.map/);
  assert.match(shell, /mobileNavigation = navigation\.filter\(\(item\) => item\.label !== "Notifications"\)/);
  assert.match(shell, /right-0 top-12.*max-w-\[calc\(100vw-2rem\)\]/);
  assert.match(shell, /aria-label="Mobile navigation"/);
});

test("narrow people rows and admin filters stack instead of squeezing content", () => {
  assert.match(source("app/components/student-result.tsx"), /grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(source("app/components/student-result.tsx"), /col-start-2 justify-self-start/);
  const adminUsers = source("app/admin/(dashboard)/users/page.tsx");
  assert.match(adminUsers, /grid gap-2 sm:grid-cols-\[minmax\(0,1fr\)_180px_auto\]/);
  assert.match(adminUsers, /mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3/);
  assert.doesNotMatch(source("app/components/issue-report-form.tsx"), /break-all/);
});
