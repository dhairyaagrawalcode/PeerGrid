import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("loaded and loading shells reserve the same mobile navigation space", () => {
  for (const name of ["app-shell", "platform-shell-skeleton"]) {
    const shell = source(`app/components/${name}.tsx`);
    assert.match(shell, /className="app-frame app-main"/);
    assert.match(shell, /className="mobile-navigation /);
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

test("account menu stays right-aligned and bounded on mobile", () => {
  const shell = source("app/components/app-shell.tsx");
  assert.match(shell, /relative ml-auto shrink-0 md:ml-0/);
  assert.match(shell, /right-0 top-12.*max-w-\[calc\(100vw-2rem\)\]/);
  assert.match(shell, /aria-label="Mobile navigation"/);
});

test("narrow people rows and admin filters stack instead of squeezing content", () => {
  assert.match(source("app/components/student-result.tsx"), /grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(source("app/components/student-result.tsx"), /col-start-2 justify-self-start/);
  assert.match(source("app/admin/(dashboard)/users/page.tsx"), /my-6 grid gap-2 sm:grid-cols-\[minmax\(0,1fr\)_auto_auto\]/);
  assert.doesNotMatch(source("app/components/issue-report-form.tsx"), /break-all/);
});
